const MAX_PROMPT_LENGTH = 30_000;

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
export const DEFAULT_TIMEOUT_MS = 120_000;

export const DEFAULT_SYSTEM_PROMPT = `You help recruiters cut through corporate bullshit on LinkedIn.
You receive the raw text of a candidate's LinkedIn profile.
Ignore buzzwords, motivational posts, humble-brags and anything that carries no factual information.
Keep only concrete facts: roles, companies, dates, technologies, measurable achievements, education.
Answer with a short summary followed by at most 5 bullet points.
Reply in the same language as the profile. Never invent information that is not in the text.`;

export type OllamaConfig = {
  host: string;
  model: string;
  systemPrompt: string;
  timeoutMs: number;
  fetch?: typeof fetch;
};

export type SendPromptOptions = {
  systemPrompt?: string;
  model?: string;
};

export type PromptRequest = {
  prompt: string;
};

export type OllamaErrorKind = "unreachable" | "timeout" | "http" | "invalid_response";

export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly kind: OllamaErrorKind,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

export function loadOllamaConfig(
  env: Record<string, string | undefined> = Bun.env,
): OllamaConfig {
  const timeoutMs = Number(env.OLLAMA_TIMEOUT_MS);

  return {
    host: env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST,
    model: env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
    systemPrompt: env.OLLAMA_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

export function parsePromptRequest(body: unknown): PromptRequest {
  if (!body || typeof body !== "object" || !("prompt" in body)) {
    throw new Error("Request body must contain a prompt string");
  }

  return { prompt: validatePrompt(body.prompt) };
}

function validatePrompt(prompt: unknown): string {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error("prompt must be a non-empty string");
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`prompt must be shorter than ${MAX_PROMPT_LENGTH} characters`);
  }

  return prompt.trim();
}

export function createOllamaClient(overrides: Partial<OllamaConfig> = {}) {
  const config: OllamaConfig = { ...loadOllamaConfig(), ...overrides };
  const endpoint = `${config.host.replace(/\/+$/, "")}/api/chat`;

  /**
   * Envoie `prompt` à Ollama (précédé du prompt système par défaut)
   * et renvoie le texte de la réponse.
   */
  async function sendPrompt(prompt: string, options: SendPromptOptions = {}): Promise<string> {
    const userPrompt = validatePrompt(prompt);
    const doFetch = config.fetch ?? fetch;

    let response: Response;
    try {
      response = await doFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model ?? config.model,
          stream: false,
          messages: [
            { role: "system", content: options.systemPrompt ?? config.systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new OllamaError(`Ollama did not answer within ${config.timeoutMs} ms`, "timeout");
      }
      throw new OllamaError(
        `Cannot reach Ollama at ${config.host}. Is it running? (ollama serve)`,
        "unreachable",
      );
    }

    if (!response.ok) {
      const details = await readErrorMessage(response);
      throw new OllamaError(`Ollama returned ${response.status}: ${details}`, "http", response.status);
    }

    const data: unknown = await response.json().catch(() => null);
    const content = (data as { message?: { content?: unknown } } | null)?.message?.content;
    if (typeof content !== "string") {
      throw new OllamaError("Ollama returned an unexpected response format", "invalid_response");
    }

    return content.trim();
  }

  return { config, sendPrompt };
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // le corps n'est pas du JSON : on retombe sur le texte brut
  }
  return text || response.statusText || "unknown error";
}

const defaultClient = createOllamaClient();

/** Raccourci : envoie un prompt avec la configuration issue de l'environnement. */
export const sendPrompt = defaultClient.sendPrompt;
