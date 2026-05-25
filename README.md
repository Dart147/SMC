# SMC

## Show Me your Code (SMC)

 An Online Code Test platform: interviewees take coding tests in the browser, and hiring managers create tests, manage candidates, and review results.

## Quick start

```bash
# Build and start everything (postgres + backend + frontend)
docker compose up -d --build

# Seed problems and test cases (first run only)
docker exec -i smc-postgres psql -U admin -d smcdb < backend/db/test_data.sql
```

The root `docker-compose.yaml` builds and starts all three services in order: postgres → backend → frontend. The backend waits for postgres to be healthy, and the frontend waits for the backend healthcheck to pass.

To reset the database:

```bash
docker compose down -v && docker compose up -d --build
```

## Repository layout

```
SMC/
├── frontend/          # Vite + React SPA (nginx on :8080)
├── backend/           # Go REST API + judge engine (:8081)
│   ├── internal/judge/   # Runner interface, ProcessRunner, DockerRunner
│   ├── db/               # PostgreSQL schema + seed data
│   └── ...
└── docker-compose.yaml   # Full stack: postgres + backend + frontend
```

### Ports

**Rule of thumb.** Frontend uses the `8xxx` range (currently just `8080`).
Everything in the Temporal / CD-service family uses the `7xxx` range to stay
visually distinct and avoid collisions. Where possible, **host port equals
container port** so there is no host/container confusion when reading logs or
config.

| Service | Container port | Host port | Source compose |
|---|---|---|---|
| `smc-postgres` | `5432` | `5432` | root `docker-compose.yaml` |
| `smc-backend` | `8081` | `8081` | root `docker-compose.yaml` |
| `smc-frontend` | `80` | `8080` | root `docker-compose.yaml` |
| Vite dev server (local only) | `5173` | `5173` | `npm run dev` |
| Temporal server (gRPC) | `7233` | `7233` | `infra/deploy/docker-compose.temporal.yaml` |
| **Temporal UI** | `7080` | `7080` | `infra/deploy/docker-compose.temporal.yaml` |
| **Temporal Postgres** | `5432` | **(unpublished)** | `infra/deploy/docker-compose.temporal.yaml` |
| **Elasticsearch (Temporal visibility)** | `9200` | **(unpublished)** | `infra/deploy/docker-compose.temporal.yaml` |
| **CD-service API** | `7082` | `7082` | `infra/deploy/docker-compose.yaml` |
| CD-service Worker | — | — | `infra/deploy/docker-compose.yaml` |

**Quick host-port reference:**

- `5173` — Vite dev server (frontend, local dev only)
- `5432` — PostgreSQL (SMC app database)
- `7080` — Temporal UI (`http://localhost:7080`)
- `7082` — CD-service webhook API
- `7233` — Temporal gRPC
- `8080` — SMC frontend (`http://localhost:8080`)
- `8081` — SMC backend API (`http://localhost:8081/api`)

## Frontend

A single-page **Vite + React 18 + TypeScript** app built around `@monaco-editor/react`. Supports Python, JavaScript, and Go; dark / light theme toggle; per-language Monaco models so each language keeps its own buffer and undo stack. Connects to the backend API to submit code and display judge results. Served by `nginx:1.27-alpine` from a multi-stage Docker build on port `8080`. For fast local iteration run `npm run dev` (Vite dev server on `http://localhost:5173`).

See **[`frontend/README.md`](frontend/README.md)** for setup, dev commands, and file layout.

## Backend

A Go 1.24 REST API (`backend/`) that serves problems and judges code submissions against PostgreSQL-backed test cases. The judge uses a pluggable `Runner` interface with two backends:

- **`ProcessRunner`** — direct subprocess per language (dev only, no isolation)
- **`DockerRunner`** — one isolated container per test case (`--network none`, `--memory 256m`, `--read-only`); selected via `JUDGE_BACKEND=docker`

Results (Accepted / Wrong Answer / TLE / MLE / Runtime Error / Compile Error) are written back asynchronously; the frontend polls until a terminal status appears.

Port: **8081**. See [`backend/README.md`](backend/README.md) for the full API reference, judge design, sandbox flags, and run instructions.