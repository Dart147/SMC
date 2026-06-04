# SMC Backend

REST API server for the **Show Me your Code** online coding interview platform. Serves problems, authenticates users, and judges code submissions securely.

## Stack

| Concern | Choice |
| --- | --- |
| Language | Go 1.24 |
| HTTP routing | `net/http` (Go 1.22 pattern-based mux) |
| Logging | `go.uber.org/zap` |
| Database | **PostgreSQL 15** (`github.com/lib/pq`) |
| Authentication | `golang-jwt/jwt/v5` |
| Cryptography | `golang.org/x/crypto/bcrypt` & `HMAC-SHA256` |
| Containerization | Docker & Docker Compose |
| Code execution | Pluggable `Runner` interface — `ProcessRunner` (dev) or `DockerRunner` (isolated containers) |

## Enterprise Security Features

* **Blind Indexing:** Usernames are deterministically hashed using HMAC-SHA256 before being stored in the database. This prevents username enumeration and protects identity privacy even in the event of a data breach.
* **Salted Password Hashing:** Passwords are never stored in plaintext. We utilize `Bcrypt` to defend against rainbow table attacks.
* **Time-Bound Exam Sessions:** Candidate accounts are strictly limited to a 3-hour testing window starting from their first successful login. Expiration logic is enforced server-side via PostgreSQL timestamps (`exam_started_at`) to prevent client-side time manipulation. Admin accounts bypass this restriction.
* **Auto-Seeding & Separation of Concerns:** Admin credentials and cryptographic keys are strictly managed via `.env` files and injected into the database via automatic seeding upon server startup, keeping secrets completely out of the source code.

## Project Layout

```text
backend/
├── cmd/api/          # Binary entry point (main.go)
├── db/               
│   └── init.sql      # PostgreSQL schema & initial seed data
├── internal/
│   ├── config/       # YAML + env config loading
│   ├── db/           # Database initialization & Admin auto-seeding
│   ├── domain/       # Core types: User, Problem, TestCase, Submission
│   ├── handler/      # HTTP handlers (Auth, Problem, Submission)
│   ├── judge/        # Runner interface, ProcessRunner, DockerRunner, semaphore coordinator
│   ├── middleware/   # CORS & JWT Protection
│   ├── repository/   # PostgreSQL data access layer
│   ├── service/      # Business logic + async judge dispatch
│   └── utils/        # Cryptography (Bcrypt/HMAC) & Utilities
├── configs/
│   └── config.yaml   # Default configuration
├── docker-compose.yml# Multi-container orchestration (API + DB)
├── Dockerfile        # Production multi-stage build
├── Dockerfile.dev    # Development build with Air (Hot Reload)
└── .env.example      # Example environment variables (secrets)


```

## API

Base URL: `http://localhost:8081/api`

| Method | Path | Description | Auth Requirement |
| --- | --- | --- | --- |
| `GET` | `/healthz` | Health check | None |
| `GET` | `/version` | Get Commit ID and version info | None |
| `POST` | `/auth/login` | Authenticate and get JWT Token | None |
| `GET` | `/problems` | List all problems | JWT |
| `GET` | `/problems/{id}` | Get details of a single problem | JWT |
| `GET` | `/submissions` | List submission history for current user | JWT (Candidate) |
| `POST` | `/submissions` | Submit code for evaluation | JWT (Candidate) |
| `GET` | `/submissions/{id}` | Get detailed verdict of a single submission | JWT (Owner Only) |
| `GET` | `/submissions/latest?problemId={id}` | Fetch the latest submission for a problem (Draft recovery) | JWT (Owner Only) |
| `GET` | `/admin/submissions?userId={id}` | Administrator view of a specific candidate's submissions | JWT (Admin Only) |

### POST /auth/login

Request body:

```json
{
  "username": "sys_admin_99",
  "password": "admin123"
}

```

Response (200 OK):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5c..."
}

```

*Note: The generated JWT payload includes an `exam_expires_at` claim (Unix timestamp) for candidate roles to sync frontend countdown timers.*

Response (401 Unauthorized) — *Invalid credentials:*

```json
{
  "error": "Invalid username or password"
}

```

Response (403 Forbidden) — *Triggered when a candidate's 3-hour exam window has expired:*

```json
{
  "error": "考試時間已結束，帳號已失效"
}

```

### POST /submissions

Request body:

```json
{
  "problemId": "1",
  "code": "nums=list(map(int,input().split()))\nt=int(input())\n...",
  "language": "python"
}


```

Supported `language` values: `python`, `javascript`, `go`, `c`, `cpp`

Response (201) — immediately returns `"Pending"`:

```json
{
  "id": "a3f8c2d1e4b5f6a7",
  "problemId": "1",
  "code": "...",
  "language": "python",
  "status": "Pending",
  "passedTestCases": 0,
  "totalTestCases": 3
}


```

#### Submission statuses

| Status | Meaning |
| --- | --- |
| `Pending` | Queued or running |
| `Accepted` | All test cases passed |
| `Wrong Answer` | Output did not match expected |
| `Time Limit Exceeded` | Process did not finish within 5 s |
| `Memory Limit Exceeded` | Process exceeded 256 MB (Linux only) |
| `Runtime Error` | Process exited non-zero |
| `Compile Error` | Compilation failed before execution (Go only) |

On failure, the response also includes:

* `"output"` — actual stdout of the failing test case (WA and RE)
* `"expectedOutput"` — expected stdout for comparison (WA only)
* `"error"` — human-readable failure description or stderr (RE, CE, TLE, MLE)

## Configuration & Environment Variables

Create a `.env` file in the root of the `backend/` directory before starting the server. **Do NOT commit the `.env` file to version control.**

### Runner interface

The judge package defines a `Runner` interface with two implementations selected at startup via `JUDGE_BACKEND`:

| Runner | Env value | Isolation | Use |
| --- | --- | --- | --- |
| `ProcessRunner` | `process` (default) | None — direct subprocess | Local development |
| `DockerRunner` | `docker` | Container per test case | Production |

A `Judge` coordinator wraps the chosen runner with a semaphore capping **4 concurrent executions**.

### ProcessRunner — execution model

| Env var | Description | Example / Default |
| --- | --- | --- |
| `DB_HOST` | PostgreSQL host | `postgres` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `admin` |
| `DB_PASSWORD` | PostgreSQL password | `password123` |
| `DB_NAME` | PostgreSQL DB name | `smcdb` |
| `JWT_SECRET` | Secret key for JWT signing | `tsmc_super_secret_jwt_key_2026_do_not_share` |
| `USERNAME_HMAC_SECRET` | Secret key for Blind Indexing | `tsmc_blind_index_hmac_key_998877` |
| `ADMIN_USERNAME` | Auto-seeded admin username | `admin` |
| `ADMIN_PASSWORD` | Auto-seeded admin password | `admin123` |

```
DB_HOST=postgres
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=password123
DB_NAME=smcdb
JWT_SECRET=tsmc_super_secret_jwt_key_2026_do_not_share
USERNAME_HMAC_SECRET=tsmc_blind_index_hmac_key_998877
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

```

### DockerRunner — sandbox model

When `JUDGE_BACKEND=docker`, each test case runs in a fresh container:

```
docker run --rm \
  --network none \           # no outbound network
  --memory 256m \            # hard memory cap (Linux cgroups)
  --cpus 0.5 \               # CPU quota
  --read-only \              # immutable root filesystem
  --tmpfs /tmp \             # writable scratch space for compilation
  -v /tmp/smc-xxx:/code_dir:ro \  # temp directory containing code.py / code.js / code.go
  python:3.12-slim \
  python3 /code_dir/code.py

```

> **Why a directory mount?** Binding a bare file (e.g. `-v file:/code.py`) to a path that doesn't pre-exist in the image causes Docker to create the target as a **directory** when `--read-only` is active. Python then treats `/code.py` as a package and fails with `can't find '__main__' module`. Mounting a temp directory avoids this — Docker always creates directory bind-mount targets correctly.

Language → image map:

| Language | Image | Notes |
| --- | --- | --- |
| `python` | `python:3.12-slim` | — |
| `javascript` | `node:20-slim` | — |
| `go` | `golang:1.22-alpine` | `GOPATH`/`GOCACHE` → `/tmp`; `GO111MODULE=off` for single-file execution without a `go.mod` |
| `c` | `gcc:14` | compiled with `gcc -O2`; compile+run in each container via `sh -c` |
| `cpp` | `gcc:14` | compiled with `g++ -O2 -std=c++17`; compile+run in each container via `sh -c` |

> **Deployment note:** `DockerRunner` requires the `docker` CLI binary and access to the Docker daemon socket. When running the backend on the host (`go run ./cmd/api`), this works automatically. When running inside a container, the socket must be mounted and `docker-cli` must be present in the image — see `ROADMAP.md` Part 8 and SMC-18 for the production solution (Temporal judge worker).

## Configuration

`configs/config.yaml` provides non-sensitive app configurations:

| YAML key | Env var | Default | Description |
| --- | --- | --- | --- |
| `port` | `PORT` | `8081` | HTTP listen port |
| `log_level` | `LOG_LEVEL` | `info` | `info` or `debug` |
| - | `DB_HOST` | `127.0.0.1` | PostgreSQL database host |
| - | `JUDGE_BACKEND` | `process` | `docker` for isolated containers, `process` for direct subprocess (dev only) |

## Running

### Full stack — all three services (recommended)

From the **repo root** (`SMC/`), the root `docker-compose.yaml` brings up postgres, backend, and frontend together:

```bash
# Build and start everything
docker compose up -d --build

# Tear down (keeps the DB volume)
docker compose down

# Tear down and wipe the DB
docker compose down -v

```

**Note on Database Initialization:** * On the first run, the PostgreSQL container will automatically execute `db/init.sql` and the Go API will auto-seed the Admin account.
Services started:

| Container | Port | Image |
| --- | --- | --- |
| `smc-postgres` | 5432 | `postgres:15-alpine` |
| `smc-backend` | 8081 | built from `./backend` |
| `smc-frontend` | 8080 | built from `./frontend` |

**Note on Database Initialization:** On the first run, `db/init.sql` creates the schema and seeds problems and test cases automatically. No manual step required.

### Backend only (with sandbox on host)

To run `DockerRunner` without the Docker-in-Docker limitation, run the backend directly on the host while postgres runs in Docker:

* The database initialization process may take 30-90 seconds on Windows/WSL2 due to Disk I/O. The `docker-compose.yml` healthcheck is configured to wait (`start_period: 90s`) to ensure safe backend startup.
* If you need to wipe and reset the database completely, remove the volume:

```bash
docker-compose down -v
# Remove physical data folder on host if needed: rm -rf db/postgres_data/
docker-compose up -d --build
# Start only postgres
cd backend && docker compose up -d postgres

# Run backend with Docker sandbox enabled
JUDGE_BACKEND=docker DB_HOST=127.0.0.1 go run ./cmd/api

```

The backend process can call `docker run` natively, and the sandbox works with full isolation.

### Backend only (process runner, dev)

```bash
cd backend && docker compose up -d --build

```

This uses `ProcessRunner` (no isolation). Suitable for development only.

## Testing the API

Quick end-to-end check after `docker compose up -d --build`. Run from any shell on the host.

### 1. Health & Version

```bash
curl -s http://localhost:8081/api/healthz
# → {"status":"ok"}

curl -s http://localhost:8081/api/version
# → {"commit":"dev","version":"dev"}


```

### 2. Authentication (Login)

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "sys_admin_99", "password": "admin123"}'
# → {"token": "eyJhbGciOiJIUzI1NiIs..."}


```

### 3. Problems

```bash
curl -s http://localhost:8081/api/problems | jq .
curl -s http://localhost:8081/api/problems/1 | jq .


```

## Port Map

| Service | Port |
| --- | --- |
| Backend API (this service) | 8081 |
| PostgreSQL Database | 5432 |
| Frontend (dev) | 5173 |
| Frontend (prod) | 8080 |

## Running CI checks locally

The Dockerfile is the toolchain. Every check CI runs is a named stage in `backend/Dockerfile`

```bash
cd /backend
docker buildx build --progress=plain --target lint .   # golangci-lint
docker buildx build --progress=plain --target format . # gofmt -l . (fails if any file needs formatting)
docker buildx build --progress=plain --target test .   # go test ./...
docker buildx build --progress=plain --target runtime -t smc-backend:local .  # final image


```

### Auto-fix Golang formatting

```bash
docker run --rm -v "$PWD":/app -w /app golang:1.26-alpine gofmt -w .


```

## CORS

The server allows all origins (`Access-Control-Allow-Origin: *`) and handles `OPTIONS` preflight requests, so the Vite dev server on port 5173 can call the API without proxy configuration. All protected API routes expect the `Authorization: Bearer <token>` header.

```