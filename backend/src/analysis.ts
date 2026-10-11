import {
  createBrightDataClient,
  parseLinkedInTarget,
  type BrightDataConfig,
} from "./brightdata";
import { createOllamaClient, type OllamaConfig, type OllamaUsage } from "./ollama";

export type AnalyzeRequest = {
  linkedinUrl: string;
};

export type CandidateAnalysis = {
  linkedinUrl: string;
  candidateName?: string;
  bullshitScore: number;
  realSkills: string[];
  concreteProjects: string[];
  summary: string;
  usage: OllamaUsage;
};

const ANALYSIS_PROMPT = `Analyze only the supplied structured LinkedIn profile data and original posts.
Return ONLY valid JSON with exactly these keys:
{
  "candidateName": "string or empty",
  "bullshitScore": 0,
  "realSkills": ["up to 4 concrete skills"],
  "concreteProjects": ["up to 2 concrete achievements or responsibilities"],
  "summary": "a factual summary in 20 words or fewer"
}
The bullshitScore is the percentage of useful, concrete signal (0-100), not a judgment of the person.
Ignore buzzwords and unsupported claims. Never invent data. Every name, skill, project and summary claim
must be directly supported by the profile or an original post. Do not infer education, employment,
seniority, technologies, achievements, dates or intentions. If the data does not support a fact, omit it.
If recentPosts is empty, use only the profile. Reposts are excluded and must not be treated as evidence.
Use the language of the profile. A low-information profile must produce empty arrays and a cautious summary.

Profile data:
`;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_TEXT_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 3;
const MAX_OBJECT_FIELDS = 8;

function compactProfile(profile: Record<string, unknown>): Record<string, unknown> {
  const fields = [
    "name", "headline", "position", "about", "post_text", "title", "date_posted",
    "hashtags", "current_company", "experience", "educations_details", "user_title",
    "account_type", "followers", "num_likes", "num_comments",
  ];
  return Object.fromEntries(
    fields
      .filter((field) => profile[field] !== undefined && profile[field] !== null)
      .map((field) => {
        return [field, compactValue(profile[field])];
      }),
  );
}

function compactPosts(posts: Record<string, unknown>[]): Record<string, unknown>[] {
  return posts.map((post) => compactProfile(post));
}

function compactValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => compactValue(item, depth + 1));
  }
  if (value && typeof value === "object" && depth < 2) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_FIELDS)
        .map(([key, item]) => [key, compactValue(item, depth + 1)]),
    );
  }
  return value;
}

export function parseAnalyzeRequest(body: unknown): AnalyzeRequest {
  if (!body || typeof body !== "object" || !("linkedinUrl" in body)) {
    throw new Error("Request body must contain a linkedinUrl string");
  }
  return { linkedinUrl: parseLinkedInTarget(body.linkedinUrl).url };
}

function parseModelAnalysis(value: string, linkedinUrl: string): CandidateAnalysis {
  const parsed = extractAnalysisObject(value);
  if (!parsed) {
    throw new Error("Ollama returned an invalid analysis format");
  }
  const result = parsed;
  const stringArray = (field: string) =>
    Array.isArray(result[field]) ? result[field].filter((item): item is string => typeof item === "string") : [];
  return {
    linkedinUrl,
    candidateName: typeof result.candidateName === "string" ? result.candidateName : undefined,
    bullshitScore: typeof result.bullshitScore === "number"
      ? Math.max(0, Math.min(100, result.bullshitScore))
      : 0,
    realSkills: stringArray("realSkills").slice(0, 4),
    concreteProjects: stringArray("concreteProjects").slice(0, 2),
    summary: typeof result.summary === "string" ? result.summary : "",
    usage: {},
  };
}

function extractAnalysisObject(value: string): Record<string, unknown> | undefined {
  const text = value.trim();
  const candidates: string[] = [];

  candidates.push(text);

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const result = parsed as Record<string, unknown>;
        if (
          "candidateName" in result ||
          "bullshitScore" in result ||
          "realSkills" in result ||
          "concreteProjects" in result ||
          "summary" in result
        ) {
          return result;
        }
      }
    } catch {
      // Try the next balanced object in the model response.
    }
  }
  return undefined;
}

export function createAnalysisService(
  dependencies: {
    brightData?: Partial<BrightDataConfig>;
    ollama?: Partial<OllamaConfig>;
  } = {},
) {
  const scraper = createBrightDataClient(dependencies.brightData);
  const ollama = createOllamaClient(dependencies.ollama);
  const cache = new Map<string, { expiresAt: number; result: CandidateAnalysis }>();

  async function analyzeProfile(url: string): Promise<CandidateAnalysis> {
    const target = parseLinkedInTarget(url);
    const cached = cache.get(target.url);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const profile = await scraper.scrapeLinkedIn(target.url, target.kind);
    const recentPosts = target.kind === "profile"
      ? await scraper.discoverRecentPosts(target.url)
      : [];
    const response = await ollama.sendPrompt(
      `${ANALYSIS_PROMPT}${JSON.stringify({
        profile: compactProfile(profile),
        recentPosts: compactPosts(recentPosts),
      })}`,
    );
    const result = parseModelAnalysis(response.content, target.url);
    result.usage = response.usage;
    cache.set(target.url, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  return { analyzeProfile };
}
