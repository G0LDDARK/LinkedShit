const MAX_INPUT_LENGTH = 30_000;
const MAX_BULLETS = 5;

export type ResumeRequest = {
  linkedinText: string;
};

export type ShortResume = {
  summary: string;
  highlights: string[];
};

export function parseResumeRequest(body: unknown): ResumeRequest {
  if (!body || typeof body !== "object" || !("linkedinText" in body)) {
    throw new Error("Request body must contain a linkedinText string");
  }

  const linkedinText = body.linkedinText;
  if (typeof linkedinText !== "string" || linkedinText.trim().length === 0) {
    throw new Error("linkedinText must be a non-empty string");
  }

  if (linkedinText.length > MAX_INPUT_LENGTH) {
    throw new Error(`linkedinText must be shorter than ${MAX_INPUT_LENGTH} characters`);
  }

  return { linkedinText: linkedinText.trim() };
}

/**
 * Provides a useful MVP response before the local agent is wired in.
 * Each non-empty source line becomes one concise highlight.
 */
export function createShortResume({ linkedinText }: ResumeRequest): ShortResume {
  const lines = linkedinText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*-]+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const highlights = lines.slice(0, MAX_BULLETS);
  const summary = highlights.join(" ");

  return {
    summary: summary.length > 500 ? `${summary.slice(0, 497)}...` : summary,
    highlights,
  };
}
