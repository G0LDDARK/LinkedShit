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

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Backend listening on http://localhost:${server.port}`);
