import { OllamaError, parsePromptRequest, sendPrompt } from "./ollama";
import { createShortResume, parseResumeRequest } from "./resume";

const port = Number(Bun.env.PORT ?? 3000);
const allowedOrigin = Bun.env.FRONTEND_ORIGIN ?? "*";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function optionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

async function handlePrompt(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  let prompt: string;
  try {
    ({ prompt } = parsePromptRequest(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return json({ error: message }, 400);
  }

  try {
    return json({ response: await sendPrompt(prompt) });
  } catch (error) {
    if (error instanceof OllamaError) {
      return json({ error: error.message }, error.kind === "timeout" ? 504 : 502);
    }
    return json({ error: "Unexpected error" }, 500);
  }
}

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return optionsResponse();
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "POST" && url.pathname === "/api/resume") {
      return request
        .json()
        .then((body) => {
          try {
            const input = parseResumeRequest(body);
            return json({ resume: createShortResume(input) });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid request";
            return json({ error: message }, 400);
          }
        })
        .catch(() => json({ error: "Request body must be valid JSON" }, 400));
    }

    if (request.method === "POST" && url.pathname === "/api/prompt") {
      return handlePrompt(request);
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Backend listening on http://localhost:${server.port}`);
