import {
  createBrightDataClient,
  parseLinkedInTarget,
  type BrightDataConfig,
} from "./brightdata";
import { createOllamaClient, type OllamaConfig } from "./ollama";

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
};

const ANALYSIS_PROMPT = `Analyze this structured LinkedIn profile data.
Return ONLY valid JSON with exactly these keys:
{
  "candidateName": "string or empty",
  "bullshitScore": 0,
  "realSkills": ["up to 8 concrete skills"],
  "concreteProjects": ["up to 5 concrete achievements or responsibilities"],
  "summary": "a short factual summary"
}
The bullshitScore is the percentage of useful, concrete signal (0-100), not a judgment of the person.
Ignore buzzwords and unsupported claims. Never invent data. Use the language of the profile.

Profile data:
`;

export function parseAnalyzeRequest(body: unknown): AnalyzeRequest {
  if (!body || typeof body !== "object" || !("linkedinUrl" in body)) {
    throw new Error("Request body must contain a linkedinUrl string");
  }
  return { linkedinUrl: parseLinkedInTarget(body.linkedinUrl).url };
}

function parseModelAnalysis(value: string, linkedinUrl: string): CandidateAnalysis {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  const json = firstBrace >= 0 && lastBrace > firstBrace
    ? value.slice(firstBrace, lastBrace + 1)
    : value.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Ollama returned an invalid analysis format");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ollama returned an invalid analysis format");
  }
  const result = parsed as Record<string, unknown>;
  const stringArray = (field: string) =>
    Array.isArray(result[field]) ? result[field].filter((item): item is string => typeof item === "string") : [];
  return {
    linkedinUrl,
    candidateName: typeof result.candidateName === "string" ? result.candidateName : undefined,
    bullshitScore: typeof result.bullshitScore === "number"
      ? Math.max(0, Math.min(100, result.bullshitScore))
      : 0,
    realSkills: stringArray("realSkills").slice(0, 8),
    concreteProjects: stringArray("concreteProjects").slice(0, 5),
    summary: typeof result.summary === "string" ? result.summary : "",
  };
}

export function createAnalysisService(
  dependencies: {
    brightData?: Partial<BrightDataConfig>;
    ollama?: Partial<OllamaConfig>;
  } = {},
) {
  const scraper = createBrightDataClient(dependencies.brightData);
  const ollama = createOllamaClient(dependencies.ollama);

  async function analyzeProfile(url: string): Promise<CandidateAnalysis> {
    const target = parseLinkedInTarget(url);
    const profile = await scraper.scrapeLinkedIn(target.url, target.kind);
    const response = await ollama.sendPrompt(`${ANALYSIS_PROMPT}${JSON.stringify(profile)}`);
    return parseModelAnalysis(response, target.url);
  }

  return { analyzeProfile };
}
