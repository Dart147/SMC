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
| Code execution | `os/exec` subprocess per language |

## Enterprise Security Features 🛡️

Designed with zero-trust principles and enterprise-grade security in mind:

* **Blind Indexing:** Usernames are deterministically hashed using HMAC-SHA256 before being stored in the database. This prevents username enumeration and protects identity privacy even in the event of a data breach.
* **Salted Password Hashing:** Passwords are never stored in plaintext. We utilize `Bcrypt` to defend against rainbow table attacks.
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
│   ├── judge/        # Code execution engine + memory-limit build tags
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

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/healthz` | Health check |
| `GET` | `/version` | Returns the commit ID and build version |
| `POST` | `/auth/login` | Authenticate user and receive JWT token |
| `GET` | `/problems` | List all problems from PostgreSQL |
| `GET` | `/problems/{id}` | Get a problem by ID from PostgreSQL |
| `GET` | `/submissions` | List all submissions history |
| `POST` | `/submissions` | Submit code for judging |
| `GET` | `/submissions/{id}` | Poll submission result |

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

### POST /submissions

Request body:

```json
{
  "problemId": "1",
  "code": "nums=list(map(int,input().split()))\nt=int(input())\n...",
  "language": "python"
}

```

Supported `language` values: `python`, `javascript`, `go`

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

`configs/config.yaml` provides non-sensitive app configurations:

| YAML key | Env var | Default | Description |
| --- | --- | --- | --- |
| `port` | `PORT` | `8081` | HTTP listen port |
| `log_level` | `LOG_LEVEL` | `info` | `info` or `debug` |

## Running (Docker Native Workflow)

The backend uses a Docker Compose workflow to automatically provision the PostgreSQL database alongside the Go API.

### 0. Prerequisites

Ensure you have created a `.env` file in the `backend/` directory as described in the Configuration section.

### 1. Start the entire stack (Recommended)

```bash
# Build and start both PostgreSQL and Go API in detached mode
docker-compose up -d --build

```

**Note on Database Initialization:** * On the first run, the PostgreSQL container will automatically execute `db/init.sql` and the Go API will auto-seed the Admin account.

* The database initialization process may take 30-90 seconds on Windows/WSL2 due to Disk I/O. The `docker-compose.yml` healthcheck is configured to wait (`start_period: 90s`) to ensure safe backend startup.
* If you need to wipe and reset the database completely, remove the volume:
```bash
docker-compose down -v
# Remove physical data folder on host if needed: rm -rf db/postgres_data/
docker-compose up -d --build

```



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