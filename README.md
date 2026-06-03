# SMC

## Show Me your Code (SMC)

An Online Code Test platform: interviewees take coding tests in the browser, and hiring managers create tests, manage candidates, and review results.

## Quick start

Create `.env` at the repo root before starting the stack (`make smc-up` reads it). Copy the same file to `backend/.env` if you also run the Go backend directly without Docker.

```bash
make smc-up      # build + start postgres → backend → frontend
make ps          # confirm containers are healthy
make healthz     # probe http://localhost:8080/api/healthz
```

Problems and test cases are seeded automatically on first run via `db/init.sql`.

### Make targets

| Command | What it does |
|---|---|
| `make smc-up` | Build images, start the stack, probe `/api/healthz`. |
| `make smc-down` | Stop the stack. Keeps the `smc-postgres-data` volume. |
| `make smc-restart` | `smc-down` then `smc-up`. Use after editing a Dockerfile or source. |
| `make logs SERVICE=backend` | Tail one service's logs (omit `SERVICE=` for all). |
| `make ps` | Show container status. |
| `make healthz` | Curl `localhost:8080/api/healthz` with 5 retries. |
| `make help` | List every target with one-line descriptions. |

Wipe the database (named volume):

```bash
make smc-down
docker compose --env-file backend/.env -f docker-compose.yaml down -v
make smc-up
```

Standard Testing Commands

```bash
# Run all unit/integration tests in headless watch mode
npm run test:unit    

# Launch the interactive Vitest UI dashboard in your browser
npm run test:unit:ui 

# Execute test suites and calculate codebase coverage metrics
npm run test:coverage
```

End-to-End Testing Commands (Playwright Suite)
```bash
# Run all E2E user-journey tests in headless mode (background execution)
npx playwright test

# Launch Playwright's Interactive UI Mode (Visual step-by-step playback)
npx playwright test --ui
```

### Deploy targets

The `make deploy*` targets pull prebuilt images from Docker Hub and run them via `.deploy/dev/`. They are intended for the host that fronts the public domain, not for laptops. Local dev uses `make smc-up` exclusively.

| Command | What it does |
|---|---|
| `make deploy` | Pull `lovetsmc/{frontend,backend}:dev`, recreate any service whose image changed. |
| `make deploy-frontend` | Same, but only the frontend. |
| `make deploy-backend` | Same, but only the backend. |
| `make deploy-down` | Stop the deployed stack. |

### PR previews (snapshot deploys)

Every pull request to `main` gets an isolated preview at
`https://pr-<N>.showmeyourcode.online` — its own `postgres + backend +
frontend` stack (Compose project `smc-pr-<N>`), separate from the shared
`dev` stack. The `frontend-snapshot.yaml` / `backend-snapshot.yaml`
workflows build the `:pr-<N>` images and POST a deploy webhook to SMC-CD,
which runs `.deploy/snapshot/deploy.sh` on the host and registers the
`pr-<N>` Cloudflare DNS record. `close.yaml` fires on PR close and tears
the stack down (`.deploy/snapshot/cleanup.sh`, `docker compose down -v`)
and removes the DNS record. Preview data is ephemeral — wiped on close.

Requires the **`SMC_HOST_IP`** repo secret (the host's public IP, written
into the new DNS record) alongside the existing `SMC_WEBHOOK_URL` /
`SMC_DEPLOY_TOKEN`. The `dev` deploy needs no IP — it reuses the
permanent `showmeyourcode.online` record — only ephemeral `pr-<N>`
hostnames need one created on the fly.

## Repository layout

```
SMC/
├── frontend/          # Vite + React SPA (nginx on :8080)
├── backend/           # Go REST API + judge engine (:8081)
│   ├── internal/judge/   # Runner interface, ProcessRunner, DockerRunner
│   ├── db/               # PostgreSQL schema + seed data
│   └── ...
├── .deploy/              # Per-env Compose stacks run on the host by SMC-CD
│   ├── dev/                 # shared dev stack (merge to main)
│   └── snapshot/            # isolated per-PR preview stack (pr-N)
└── docker-compose.yaml   # Full stack: postgres + backend + frontend
```

### Ports


| Service | Container port | Host port | Source compose |
|---|---|---|---|
| `smc-postgres` | `5432` | `5432` | root `docker-compose.yaml` |
| `smc-backend` | `8081` | `8081` | root `docker-compose.yaml` |
| `smc-frontend` | `80` | `8080` | root `docker-compose.yaml` |
| Vite dev server (local only) | `5173` | `5173` | `npm run dev` |
| Temporal server (gRPC) | `7233` | `7233` | `infra/deploy/docker-compose.temporal.yaml` |
| Temporal UI | `7080` | `7080` | `infra/deploy/docker-compose.temporal.yaml` |
| Temporal Postgres | `5432` | (unpublished) | `infra/deploy/docker-compose.temporal.yaml` |
| Elasticsearch (Temporal visibility) | `9200` | (unpublished) | `infra/deploy/docker-compose.temporal.yaml` |
| CD-service API | `7082` | `7082` | `infra/deploy/docker-compose.yaml` |
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

### `sqlc-verify` Guard

The backend CI runs an `sqlc-verify` stage as a drift guard: it runs `sqlc generate` from scratch and diffs the result against the committed `internal/db/*.go`. If anyone edits `schema.sql` or `queries/*.sql` without re-running `sqlc generate` locally and committing the regenerated `internal/db/*.go`, this check fails and blocks the PR.

To fix: 
```bash
cd backend/
docker run --rm -v "$(pwd):/src" -w /src sqlc/sqlc generate
```