# SMC

## What this is

Show Me your Code (SMC) is an Online Code Test platform: interviewees take coding tests in the browser, and hiring managers create tests, manage candidates, and review results.

## Quick start

```bash
# Run the full stack (frontend on :8080, backend on :8081)
docker compose up --build
```

The root `docker-compose.yaml` builds and starts both services. The frontend waits for the backend healthcheck to pass before coming up.

## Repository layout

```
SMC/
├── frontend/   # browser apps.
├── backend/    # API + grader services — TBD
└── infra/      # docker-compose / Traefik / observability — TBD
```

### Ports

**Rule of thumb.** Frontend uses the `8xxx` range (currently just `8080`).
Everything in the Temporal / CD-service family uses the `7xxx` range to stay
visually distinct and avoid collisions. Where possible, **host port equals
container port** so there is no host/container confusion when reading logs or
config.

| Service | Container port | Host port (SMC) | Source compose | Action |
|---|---|---|---|---|
| Frontend nginx (SMC) | `80` | `8080` | `frontend/docker-compose.yaml` | keep — already in use |
| Vite dev server (SMC, local-only) | `5173` | `5173` | `npm run dev` | keep |
| Temporal server (gRPC) | `7233` | `7233` | `infra/deploy/docker-compose.temporal.yaml` | keep as upstream |
| **Temporal UI** | `7080` | `7080` | `infra/deploy/docker-compose.temporal.yaml` | **remap** from upstream `8080` so the temporal family stays in `7xxx` and we never share digits with the frontend. `TEMPORAL_UI_PORT=7080` set on the container. |
| **Temporal Postgres** | `5432` | **(unpublished)** | `infra/deploy/docker-compose.temporal.yaml` | **no `ports:` block** — Temporal reaches Postgres by service name on the internal Docker network. Frees host `5432` for SMC's future application Postgres. |
| **Elasticsearch (Temporal visibility)** | `9200` | **(unpublished)** | `infra/deploy/docker-compose.temporal.yaml` | **no `ports:` block** — same reasoning. Frees host `9200` for SMC's own use later. |
| **CD-service API** | `7082` | `7082` | `infra/deploy/docker-compose.yaml` | **remap** from upstream `8080`/`8082` so the temporal family stays in `7xxx`. `PORT=7082` env + `server.port: "7082"` in `config.example.yaml` + `EXPOSE 7082` in `Dockerfile` all aligned. |
| CD-service Worker | — | — | `infra/deploy/docker-compose.yaml` | no inbound port; outbound poll to Temporal only. |

**Quick host-port reference (what to `curl` from your laptop):**

- `5173` — Vite dev (frontend, optional)
- `7080` — Temporal UI (`http://localhost:7080`)
- `7082` — CD-service webhook API (`http://localhost:7082/api/webhook/deploy`)
- `7233` — Temporal gRPC (for SDK clients)
- `8080` — SMC frontend nginx (`http://localhost:8080`)
- `8081` — SMC backend API (`http://localhost:8081/api`)

## Frontend

A single-page **Vite + React 18 + TypeScript** app built around `@monaco-editor/react`. Supports Python, JavaScript, and Go; dark / light theme toggle; per-language Monaco models so each language keeps its own buffer and undo stack. Connects to the backend API to submit code and display judge results. Served by `nginx:1.27-alpine` from a multi-stage Docker build on port `8080`. For fast local iteration run `npm run dev` (Vite dev server on `http://localhost:5173`).

See **[`frontend/README.md`](frontend/README.md)** for setup, dev commands, and file layout.

## Backend

A Go 1.24 REST API (`backend/`) that serves problems and judges code submissions. Submissions are executed in a subprocess per language (Python, JavaScript, Node.js, Go), stdout is compared against test cases seeded from YAML, and the result (AC / WA / TLE / MLE / RE / CE) is written back asynchronously. The frontend polls `GET /api/submissions/{id}` until a terminal status appears.

Port: **8081**. See [`backend/README.md`](backend/README.md) for the full API reference, judge design, and run instructions.

## Infra

**TBD.** Will hold the unified `docker-compose` / Traefik / observability configuration that ties the frontend, backend, and supporting services together for the single-host deployment.