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

The backend then:

1. Scrapes the profile through Bright Data.
2. Sends the structured profile to the local Ollama model.
3. Returns a typed candidate analysis.

Configure the providers with environment variables (keep these in a local
`.env`, never in the frontend):

```bash
cp backend/.env.example backend/.env
BRIGHTDATA_API_KEY=your_api_key
BRIGHTDATA_DATASET_ID=gd_l1viktl72bvl7bjuj0
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2
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
