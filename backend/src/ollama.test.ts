import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  DEFAULT_OLLAMA_HOST,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  OllamaError,
  createOllamaClient,
  loadOllamaConfig,
  parsePromptRequest,
} from "./ollama";

type Captured = { url: string; init: RequestInit };

/** Faux fetch : mémorise l'appel et renvoie la réponse fournie. */
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Captured[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
  return { impl, calls };
}

const okResponse = (content: string) => Response.json({ message: { role: "assistant", content } });

describe("loadOllamaConfig", () => {
  test("uses sensible defaults", () => {
    expect(loadOllamaConfig({})).toEqual({
      host: DEFAULT_OLLAMA_HOST,
      model: DEFAULT_OLLAMA_MODEL,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      timeoutMs: 120_000,
    });
  });

  test("reads overrides from the environment", () => {
    const config = loadOllamaConfig({
      OLLAMA_HOST: "http://gpu-box:11434",
      OLLAMA_MODEL: "mistral",
      OLLAMA_SYSTEM_PROMPT: "Be brief.",
      OLLAMA_TIMEOUT_MS: "5000",
    });
    expect(config).toEqual({
      host: "http://gpu-box:11434",
      model: "mistral",
      systemPrompt: "Be brief.",
      timeoutMs: 5000,
    });
  });

  test("ignores an invalid timeout", () => {
    expect(loadOllamaConfig({ OLLAMA_TIMEOUT_MS: "abc" }).timeoutMs).toBe(120_000);
  });
});

describe("parsePromptRequest", () => {
  test("validates and trims the prompt", () => {
    expect(parsePromptRequest({ prompt: "  hello  " })).toEqual({ prompt: "hello" });
  });

  test("rejects a missing prompt", () => {
    expect(() => parsePromptRequest({})).toThrow("Request body must contain a prompt string");
    expect(() => parsePromptRequest(null)).toThrow("Request body must contain a prompt string");
  });

  test("rejects an empty or non-string prompt", () => {
    expect(() => parsePromptRequest({ prompt: "   " })).toThrow("prompt must be a non-empty string");
    expect(() => parsePromptRequest({ prompt: 42 })).toThrow("prompt must be a non-empty string");
  });

  test("rejects a prompt that is too long", () => {
    expect(() => parsePromptRequest({ prompt: "a".repeat(30_001) })).toThrow("shorter than");
  });
});

describe("sendPrompt", () => {
  test("sends the default system prompt followed by the user prompt", async () => {
    const { impl, calls } = fakeFetch(() => okResponse("done"));
    const client = createOllamaClient({ host: "http://ollama.test", model: "m1", fetch: impl });

    await client.sendPrompt("Summarize this profile");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("http://ollama.test/api/chat");
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      model: "m1",
      stream: false,
      messages: [
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
        { role: "user", content: "Summarize this profile" },
      ],
    });
  });

  test("returns the trimmed assistant message", async () => {
    const { impl } = fakeFetch(() => okResponse("  Senior engineer at ACME.\n"));
    const client = createOllamaClient({ fetch: impl });

    expect(await client.sendPrompt("hi")).toBe("Senior engineer at ACME.");
  });

  test("lets a call override the system prompt and the model", async () => {
    const { impl, calls } = fakeFetch(() => okResponse("ok"));
    const client = createOllamaClient({ fetch: impl });

    await client.sendPrompt("hi", { systemPrompt: "Be rude.", model: "other" });

    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.model).toBe("other");
    expect(body.messages[0]).toEqual({ role: "system", content: "Be rude." });
  });

  test("does not double the slash when the host ends with one", async () => {
    const { impl, calls } = fakeFetch(() => okResponse("ok"));
    await createOllamaClient({ host: "http://ollama.test/", fetch: impl }).sendPrompt("hi");

    expect(calls[0]!.url).toBe("http://ollama.test/api/chat");
  });

  test("rejects an empty prompt without calling Ollama", async () => {
    const { impl, calls } = fakeFetch(() => okResponse("ok"));
    const client = createOllamaClient({ fetch: impl });

    await expect(client.sendPrompt("   ")).rejects.toThrow("prompt must be a non-empty string");
    expect(calls).toHaveLength(0);
  });

  test("reports Ollama's error message on HTTP errors (e.g. unknown model)", async () => {
    const { impl } = fakeFetch(() => Response.json({ error: "model 'nope' not found" }, { status: 404 }));
    const client = createOllamaClient({ fetch: impl });

    const error = await client.sendPrompt("hi").catch((e) => e);
    expect(error).toBeInstanceOf(OllamaError);
    expect(error.kind).toBe("http");
    expect(error.status).toBe(404);
    expect(error.message).toContain("model 'nope' not found");
  });

  test("reports an unreachable Ollama", async () => {
    const { impl } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    const client = createOllamaClient({ host: "http://ollama.test", fetch: impl });

    const error = await client.sendPrompt("hi").catch((e) => e);
    expect(error).toBeInstanceOf(OllamaError);
    expect(error.kind).toBe("unreachable");
    expect(error.message).toContain("http://ollama.test");
  });

  test("reports a malformed response", async () => {
    const { impl } = fakeFetch(() => Response.json({ unexpected: true }));
    const client = createOllamaClient({ fetch: impl });

    const error = await client.sendPrompt("hi").catch((e) => e);
    expect(error).toBeInstanceOf(OllamaError);
    expect(error.kind).toBe("invalid_response");
  });
});

describe("sendPrompt over real HTTP (mock Ollama server)", () => {
  let mock: ReturnType<typeof Bun.serve>;
  let lastBody: any;

  beforeAll(() => {
    mock = Bun.serve({
      port: 0, // port libre choisi par l'OS
      async fetch(request) {
        const url = new URL(request.url);
        if (request.method === "POST" && url.pathname === "/api/chat") {
          lastBody = await request.json();
          return Response.json({ message: { role: "assistant", content: "mock answer" } });
        }
        return new Response("not found", { status: 404 });
      },
    });
  });

  afterAll(() => {
    mock.stop(true);
  });

  test("round-trips a prompt through a real HTTP call", async () => {
    const client = createOllamaClient({ host: `http://localhost:${mock.port}`, model: "mock" });

    expect(await client.sendPrompt("hello")).toBe("mock answer");
    expect(lastBody.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
    expect(lastBody.messages[1].content).toBe("hello");
  });

  test("times out when Ollama is too slow", async () => {
    const slow = Bun.serve({
      port: 0,
      async fetch() {
        await Bun.sleep(500);
        return Response.json({ message: { content: "late" } });
      },
    });
    try {
      const client = createOllamaClient({ host: `http://localhost:${slow.port}`, timeoutMs: 50 });
      const error = await client.sendPrompt("hi").catch((e) => e);

      expect(error).toBeInstanceOf(OllamaError);
      expect(error.kind).toBe("timeout");
    } finally {
      slow.stop(true);
    }
  });
});
