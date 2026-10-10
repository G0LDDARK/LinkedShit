# LinkendShit
Avoid corporate bullshit as a recruiter by scanning canditate profile and removing all useless posts and getting straight to the point

## Project structure

- [`frontend/`](./frontend): React/Vite interface. It only talks to the API
  through [`src/api/client.ts`](./frontend/src/api/client.ts).
- [`backend/`](./backend): Bun API and domain logic. It has no database.

The boundary between the two parts is JSON over HTTP. That means a future
scraper, database, or agent provider can be added in the backend without
putting that code into React components.

## Backend

The MVP backend is in [`backend/`](./backend). It uses Bun and TypeScript and does
not require a database.

### Run it

```bash
cd backend
bun install
bun run dev
```

The server listens on `http://localhost:3000` by default. Set `PORT` to use a
different port and `FRONTEND_ORIGIN` to restrict CORS to the React app's origin.

### API

- `GET /health` returns `{ "status": "ok" }`.
- `POST /api/resume` accepts `{ "linkedinText": "..." }` and returns:

  ```json
  {
    "resume": {
      "summary": "A concise summary",
      "highlights": ["A concise", "list of highlights"]
    }
  }
  ```

The current transformation is deterministic so the frontend can be integrated
now. The implementation can later be replaced by the local agent without
changing the HTTP contract.

### Full LinkedIn analysis

`POST /api/analyze` accepts a public profile URL or a specific LinkedIn post/article URL:

```json
{ "linkedinUrl": "https://www.linkedin.com/in/example" }
```

Supported URL shapes include:

- `https://www.linkedin.com/in/...` for profiles
- `https://www.linkedin.com/posts/...` for individual posts
- `https://www.linkedin.com/pulse/...` for LinkedIn articles

A company/showcase posts feed such as
`/showcase/example/posts/?feedView=all` is not one specific post. Paste the URL
of an individual post from that feed instead.

For a profile URL, the service uses three recent posts as a low-cost signal of
the candidate's actual activity. For a direct `/posts/...` or `/pulse/...` URL,
only that supplied post is analyzed because Bright Data cannot safely infer the
author profile from every post URL.

### Performance notes

The first request can take time because Bright Data performs a live scrape and
the local Ollama model may need to load. The backend keeps the model warm for
30 minutes, disables unnecessary reasoning for this extraction task, limits
the response to a compact JSON shape, and caches completed analyses in memory
for five minutes. A repeated request for the same URL is therefore immediate.

`BRIGHTDATA_TIMEOUT_MS` controls the maximum synchronous scrape wait. Bright
Data can legitimately take close to one minute; for a production UI, the next
step would be an asynchronous trigger/polling flow so the browser does not
hold the request open.

The backend then:

1. Scrapes the profile through Bright Data.
2. Discovers the **3 most recent posts** for profile URLs through Bright Data.
3. Sends the compact profile plus those posts to the local Ollama model.
4. Returns a typed candidate analysis.

Configure the providers with environment variables (keep these in a local
`.env`, never in the frontend):

```bash
cp backend/.env.example backend/.env
BRIGHTDATA_API_KEY=your_api_key
BRIGHTDATA_DATASET_ID=gd_l1viktl72bvl7bjuj0
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_KEEP_ALIVE=30m
OLLAMA_NUM_PREDICT=220
OLLAMA_TEMPERATURE=0
OLLAMA_THINK=false
```

Bright Data may return HTTP `202` with a `snapshotId` when a scrape takes more
than one minute. The API forwards that state explicitly so a future polling
workflow can be added without changing the provider boundary.

Run the tests with:

```bash
bun test
```

## Frontend

In another terminal:

```bash
cd frontend
bun install
bun run dev
```

Open `http://localhost:5173`. In development, Vite proxies `/api` to
`http://localhost:3000`, so both servers must be running.

The form accepts the raw text returned by a LinkedIn scraper and sends it to
`POST /api/analyze`. The backend fetches the profile and asks Ollama to
structure the result. The frontend API client validates the response and
exposes transport errors without embedding fetch logic in the page component.

For a separate frontend/backend deployment, copy
[`frontend/.env.example`](./frontend/.env.example) to `frontend/.env` and set:

```bash
VITE_API_URL=https://your-backend.example.com
```

Then configure the backend's `FRONTEND_ORIGIN` to the deployed frontend origin.
