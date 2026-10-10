import { describe, expect, test } from "bun:test";
import { createOllamaClient } from "./ollama";

describe.skipIf(!Bun.env.OLLAMA_LIVE)("live Ollama", () => {
  test("answers a simple prompt", async () => {
    const client = createOllamaClient();
    const answer = await client.sendPrompt("Say hello in one short sentence.");

    console.log(`[${client.config.model}] ${answer}`);
    expect(answer.length).toBeGreaterThan(0);
  }, 180_000);
});
