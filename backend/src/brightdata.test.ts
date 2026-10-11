import { describe, expect, test } from "bun:test";
import {
  BrightDataError,
  createBrightDataClient,
  loadBrightDataConfig,
  parseLinkedInUrl,
  parseLinkedInTarget,
  selectRecentOriginalPosts,
} from "./brightdata";

describe("Bright Data client", () => {
  test("validates LinkedIn profile URLs", () => {
    expect(parseLinkedInUrl("https://www.linkedin.com/in/jane-doe")).toBe(
      "https://www.linkedin.com/in/jane-doe",
    );
    expect(parseLinkedInTarget("https://fr.linkedin.com/in/jane-doe/").kind).toBe("profile");
    expect(parseLinkedInTarget("https://www.linkedin.com/posts/jane_update-123")).toMatchObject({
      kind: "post",
    });
    expect(() => parseLinkedInUrl("https://www.linkedin.com/showcase/acme/posts/?feedView=all")).toThrow(
      "posts feed",
    );
  });

  test("loads configuration from environment", () => {
    expect(loadBrightDataConfig({
      BRIGHTDATA_API_KEY: "secret",
      BRIGHTDATA_DATASET_ID: "custom",
      BRIGHTDATA_TIMEOUT_MS: "5000",
    })).toMatchObject({ apiKey: "secret", datasetId: "custom", timeoutMs: 5000 });
  });

  test("sends a profile URL and parses the first record", async () => {
    let request: Request | undefined;
    const client = createBrightDataClient({
      apiKey: "secret",
      host: "https://brightdata.test",
      fetch: (async (input, init) => {
        request = new Request(input, init);
        return Response.json([{ name: "Jane Doe", about: "Engineer" }]);
      }) as typeof fetch,
    });

    await expect(client.scrapeLinkedInProfile("https://www.linkedin.com/in/jane-doe")).resolves.toEqual({
      name: "Jane Doe",
      about: "Engineer",
    });
    expect(request?.url).toContain("dataset_id=gd_l1viktl72bvl7bjuj0");
    expect(request?.headers.get("Authorization")).toBe("Bearer secret");
    expect(await request?.json()).toEqual({ input: [{ url: "https://www.linkedin.com/in/jane-doe" }] });
  });

  test("uses the posts dataset for a specific post URL", async () => {
    let request: Request | undefined;
    const client = createBrightDataClient({
      apiKey: "secret",
      host: "https://brightdata.test",
      fetch: (async (input, init) => {
        request = new Request(input, init);
        return Response.json([{ post_text: "Built a useful thing." }]);
      }) as typeof fetch,
    });

    await client.scrapeLinkedIn(
      "https://www.linkedin.com/posts/jane_update-123",
      "post",
    );
    expect(request?.url).toContain("dataset_id=gd_lyy3tktm25m4avu764");
  });

  test("discovers three recent posts for a profile", async () => {
    let request: Request | undefined;
    const client = createBrightDataClient({
      apiKey: "secret",
      host: "https://brightdata.test",
      fetch: (async (input, init) => {
        request = new Request(input, init);
        return Response.json([
          { post_text: "one" },
          { post_text: "two" },
          { post_text: "three" },
          { post_text: "four" },
        ]);
      }) as typeof fetch,
    });

    await expect(client.discoverRecentPosts("https://www.linkedin.com/in/jane-doe")).resolves.toEqual([
      { post_text: "one" },
      { post_text: "two" },
      { post_text: "three" },
    ]);
    expect(request?.url).toContain("type=discover_new");
    expect(request?.url).toContain("discover_by=profile_url");
    expect(await request?.json()).toEqual({
      input: [{ url: "https://www.linkedin.com/in/jane-doe" }],
      limit_per_input: 3,
    });
  });

  test("excludes reposts and keeps the three newest original posts", () => {
    expect(selectRecentOriginalPosts([
      { date_posted: "2025-01-01", post_text: "old" },
      { date_posted: "2025-01-04", post_text: "repost", is_repost: true },
      { date_posted: "2025-01-03", post_text: "newest original" },
      { date_posted: "2025-01-02", post_text: "middle original" },
      { date_posted: "2025-01-05", post_text: "reshare", post_type: "repost" },
    ], 3)).toEqual([
      { date_posted: "2025-01-03", post_text: "newest original" },
      { date_posted: "2025-01-02", post_text: "middle original" },
      { date_posted: "2025-01-01", post_text: "old" },
    ]);
  });

  test("exposes a pending snapshot instead of losing the job", async () => {
    const client = createBrightDataClient({
      apiKey: "secret",
      fetch: (async () => Response.json({ snapshot_id: "snap-123" }, { status: 202 })) as typeof fetch,
    });
    const error = await client.scrapeLinkedInProfile("https://www.linkedin.com/in/jane-doe").catch((value) => value);
    expect(error).toBeInstanceOf(BrightDataError);
    expect(error.kind).toBe("pending");
    expect(error.snapshotId).toBe("snap-123");
  });
});
