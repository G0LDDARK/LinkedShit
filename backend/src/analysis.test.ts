import { describe, expect, test } from "bun:test";
import { createAnalysisService } from "./analysis";

describe("profile analysis pipeline", () => {
  test("scrapes a profile and sends the structured data to Ollama", async () => {
    let ollamaBody: { messages: Array<{ content: string }> } | undefined;
    const service = createAnalysisService({
      brightData: {
        apiKey: "brightdata-test",
        fetch: (async () => Response.json([{ name: "Jane Doe", about: "Builds APIs" }])) as typeof fetch,
        discoverRecentPosts: undefined,
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

    await expect(service.analyzeProfile("https://www.linkedin.com/in/jane-doe")).resolves.toMatchObject({
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

  test("extracts the analysis when the model includes another brace-delimited block", async () => {
    const service = createAnalysisService({
      brightData: {
        apiKey: "brightdata-test",
        fetch: (async () => Response.json([{ name: "Jane Doe" }])) as typeof fetch,
      },
      ollama: {
        fetch: (async () => Response.json({
          message: {
            content: 'Reasoning example: {"ignored":"block"}\nFinal:\n{"candidateName":"Jane Doe","bullshitScore":70,"realSkills":["APIs"],"concreteProjects":[],"summary":"Builds APIs."}\nDone.',
          },
        })) as typeof fetch,
      },
    });

    await expect(service.analyzeProfile("https://www.linkedin.com/in/jane-doe")).resolves.toMatchObject({
      candidateName: "Jane Doe",
      bullshitScore: 70,
      realSkills: ["APIs"],
    });
  });

  test("keeps large nested Bright Data records within the prompt budget", async () => {
    let prompt = "";
    const service = createAnalysisService({
      brightData: {
        apiKey: "brightdata-test",
        fetch: (async () => Response.json([{
          name: "Jane Doe",
          about: "A".repeat(20_000),
          experience: Array.from({ length: 20 }, () => ({ description: "B".repeat(20_000) })),
        }])) as typeof fetch,
      },
      ollama: {
        fetch: (async (_input, init) => {
          prompt = JSON.parse(init?.body as string).messages[1].content;
          return Response.json({
            message: {
              content: '{"candidateName":"Jane Doe","bullshitScore":50,"realSkills":[],"concreteProjects":[],"summary":"Engineer."}',
            },
          });
        }) as typeof fetch,
      },
    });

    await service.analyzeProfile("https://www.linkedin.com/in/jane-doe");
    expect(prompt.length).toBeLessThan(30_000);
  });
});
