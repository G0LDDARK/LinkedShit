import { describe, expect, test } from "bun:test";
import { createAnalysisService } from "./analysis";

describe("profile analysis pipeline", () => {
  test("scrapes a profile and sends the structured data to Ollama", async () => {
    let ollamaBody: { messages: Array<{ content: string }> } | undefined;
    const service = createAnalysisService({
      brightData: {
        apiKey: "brightdata-test",
        fetch: (async () => Response.json([{ name: "Jane Doe", about: "Builds APIs" }])) as typeof fetch,
      },
      ollama: {
        fetch: (async (_input, init) => {
          ollamaBody = JSON.parse(init?.body as string);
          return Response.json({
            message: {
              content: JSON.stringify({
                candidateName: "Jane Doe",
                bullshitScore: 90,
                realSkills: ["API design"],
                concreteProjects: ["Builds APIs"],
                summary: "Engineer focused on API development.",
              }),
            },
          });
        }) as typeof fetch,
      },
    });

    await expect(service.analyzeProfile("https://www.linkedin.com/in/jane-doe")).resolves.toEqual({
      linkedinUrl: "https://www.linkedin.com/in/jane-doe",
      candidateName: "Jane Doe",
      bullshitScore: 90,
      realSkills: ["API design"],
      concreteProjects: ["Builds APIs"],
      summary: "Engineer focused on API development.",
    });
    expect(ollamaBody?.messages[1]?.content).toContain('"name":"Jane Doe"');
  });

  test("accepts JSON surrounded by model formatting", async () => {
    const service = createAnalysisService({
      brightData: {
        apiKey: "brightdata-test",
        fetch: (async () => Response.json([{ name: "Jane Doe" }])) as typeof fetch,
      },
      ollama: {
        fetch: (async () => Response.json({
          message: {
            content: 'Here is the result:\n```json\n{"candidateName":"Jane Doe","bullshitScore":50,"realSkills":[],"concreteProjects":[],"summary":"Clear summary."}\n```',
          },
        })) as typeof fetch,
      },
    });

    await expect(service.analyzeProfile("https://www.linkedin.com/in/jane-doe")).resolves.toMatchObject({
      candidateName: "Jane Doe",
      summary: "Clear summary.",
    });
  });
});
