const DEFAULT_HOST = "https://api.brightdata.com";
export const PROFILE_DATASET_ID = "gd_l1viktl72bvl7bjuj0";
export const POSTS_DATASET_ID = "gd_lyy3tktm25m4avu764";
export const DEFAULT_RECENT_POST_LIMIT = 3;
const DEFAULT_DATASET_ID = PROFILE_DATASET_ID;
const DEFAULT_TIMEOUT_MS = 70_000;

export type BrightDataConfig = {
  apiKey: string;
  host: string;
  datasetId: string;
  timeoutMs: number;
  fetch?: typeof fetch;
};

export type LinkedInProfile = Record<string, unknown>;
export type LinkedInTargetKind = "profile" | "post";

export type LinkedInTarget = {
  url: string;
  kind: LinkedInTargetKind;
};

export class BrightDataError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_configured" | "unreachable" | "timeout" | "http" | "pending",
    public readonly status?: number,
    public readonly snapshotId?: string,
  ) {
    super(message);
    this.name = "BrightDataError";
  }
}

export function loadBrightDataConfig(
  env: Record<string, string | undefined> = Bun.env,
): BrightDataConfig {
  const timeoutMs = Number(env.BRIGHTDATA_TIMEOUT_MS);
  return {
    apiKey: env.BRIGHTDATA_API_KEY ?? "",
    host: env.BRIGHTDATA_HOST || DEFAULT_HOST,
    datasetId: env.BRIGHTDATA_DATASET_ID || DEFAULT_DATASET_ID,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

export function parseLinkedInUrl(value: unknown): string {
  return parseLinkedInTarget(value).url;
}

export function parseLinkedInTarget(value: unknown): LinkedInTarget {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("linkedinUrl must be a non-empty URL");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("linkedinUrl must be a valid URL");
  }

  const hostname = url.hostname.toLowerCase();
  const isLinkedInHost = hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
  const path = url.pathname.replace(/\/+$/, "");
  if (!isLinkedInHost || !["https:", "http:"].includes(url.protocol)) {
    throw new Error("linkedinUrl must be a LinkedIn URL");
  }

  if (/^\/in\/[^/]+$/i.test(path)) {
    url.protocol = "https:";
    return { url: url.toString(), kind: "profile" };
  }

  if (/^\/(?:posts|pulse)\/[^/]+$/i.test(path)) {
    url.protocol = "https:";
    return { url: url.toString(), kind: "post" };
  }

  if (/^\/(?:company|showcase)\/[^/]+\/posts$/i.test(path)) {
    throw new Error(
      "This is a LinkedIn posts feed. Paste one specific post URL (/posts/...) or a profile URL (/in/...) instead.",
    );
  }

  throw new Error("Use a LinkedIn profile URL (/in/...) or a specific post URL (/posts/... or /pulse/...)");
}

export function createBrightDataClient(overrides: Partial<BrightDataConfig> = {}) {
  const config = { ...loadBrightDataConfig(), ...overrides };
  const doFetch = config.fetch ?? fetch;

  async function scrapeLinkedInProfile(url: string): Promise<LinkedInProfile> {
    return scrapeLinkedIn(url, "profile");
  }

  async function scrapeLinkedIn(url: string, kind: LinkedInTargetKind): Promise<LinkedInProfile> {
    if (!config.apiKey) {
      throw new BrightDataError("Bright Data is not configured. Set BRIGHTDATA_API_KEY.", "not_configured");
    }

    let response: Response;
    try {
      const endpoint = new URL("/datasets/v3/scrape", config.host);
      endpoint.searchParams.set(
        "dataset_id",
        kind === "post" ? POSTS_DATASET_ID : config.datasetId,
      );
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("include_errors", "true");

      response = await doFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: [{ url }] }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new BrightDataError(`Bright Data did not answer within ${config.timeoutMs} ms`, "timeout");
      }
      throw new BrightDataError("Cannot reach Bright Data.", "unreachable");
    }

    const responseText = await response.text().catch(() => "");
    const data = parseJson(responseText);
    if (response.status === 202) {
      const snapshotId = (data as { snapshot_id?: unknown } | null)?.snapshot_id;
      throw new BrightDataError(
        "Bright Data is still scraping this profile. Try again in a moment.",
        "pending",
        202,
        typeof snapshotId === "string" ? snapshotId : undefined,
      );
    }

    if (!response.ok) {
      const details = extractErrorDetails(data, responseText);
      throw new BrightDataError(
        `Bright Data returned ${response.status}: ${details}`,
        "http",
        response.status,
      );
    }

    const profile = Array.isArray(data) ? data[0] : data;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      throw new BrightDataError("Bright Data returned no LinkedIn profile.", "http", 502);
    }

    return profile as LinkedInProfile;
  }

  async function discoverRecentPosts(
    profileUrl: string,
    limit = DEFAULT_RECENT_POST_LIMIT,
  ): Promise<LinkedInProfile[]> {
    if (!config.apiKey) {
      throw new BrightDataError("Bright Data is not configured. Set BRIGHTDATA_API_KEY.", "not_configured");
    }

    const endpoint = new URL("/datasets/v3/scrape", config.host);
    endpoint.searchParams.set("dataset_id", POSTS_DATASET_ID);
    endpoint.searchParams.set("format", "json");
    endpoint.searchParams.set("include_errors", "true");
    endpoint.searchParams.set("type", "discover_new");
    endpoint.searchParams.set("discover_by", "profile_url");

    let response: Response;
    try {
      response = await doFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: [{ url: profileUrl }],
          limit_per_input: limit,
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new BrightDataError(`Bright Data did not answer within ${config.timeoutMs} ms`, "timeout");
      }
      throw new BrightDataError("Cannot reach Bright Data.", "unreachable");
    }

    const responseText = await response.text().catch(() => "");
    const data = parseJson(responseText);
    if (response.status === 202) {
      const snapshotId = (data as { snapshot_id?: unknown } | null)?.snapshot_id;
      throw new BrightDataError(
        "Bright Data is still discovering recent posts. Try again in a moment.",
        "pending",
        202,
        typeof snapshotId === "string" ? snapshotId : undefined,
      );
    }
    if (!response.ok) {
      throw new BrightDataError(
        `Bright Data returned ${response.status}: ${extractErrorDetails(data, responseText)}`,
        "http",
        response.status,
      );
    }

    if (!Array.isArray(data)) {
      throw new BrightDataError("Bright Data returned no recent posts.", "http", 502);
    }
    return data
      .filter((post): post is LinkedInProfile => Boolean(post && typeof post === "object" && !Array.isArray(post)))
      .slice(0, limit);
  }

  return { config, scrapeLinkedInProfile, scrapeLinkedIn, discoverRecentPosts };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractErrorDetails(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["error", "message", "detail"]) {
      if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
    }
    try {
      return JSON.stringify(data);
    } catch {
      return "request failed";
    }
  }
  return fallback.trim() || "request failed";
}
