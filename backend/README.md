# SMC Backend

REST API server for the **Show Me your Code** online coding interview platform. Serves problems and judges code submissions.

## Stack

| Concern | Choice |
|---|---|
| Language | Go 1.24 |
| HTTP routing | `net/http` (Go 1.22 pattern-based mux) |
| Logging | `go.uber.org/zap` |
| Database | **PostgreSQL 15** (`github.com/lib/pq`) |
| Storage | Relational Database (Replaced In-memory storage) |
| Containerization | Docker & Docker Compose |
| Code execution | `os/exec` subprocess per language |

## Project Layout

```text
backend/
├── cmd/api/          # Binary entry point (main.go)
├── db/               
│   └── init.sql      # PostgreSQL schema & initial seed data (Problems)
├── internal/
│   ├── config/       # YAML + env config loading
│   ├── domain/       # Core types: Problem, TestCase, Submission
│   ├── handler/      # HTTP handlers
│   ├── judge/        # Code execution engine + memory-limit build tags
│   ├── middleware/   # CORS
│   ├── repository/   # PostgreSQL data access layer
│   └── service/      # Business logic + async judge dispatch
├── configs/
│   └── config.yaml   # Default configuration
├── docker-compose.yml# Multi-container orchestration (API + DB)
├── Dockerfile        # Production multi-stage build
└── Dockerfile.dev    # Development build with Air (Hot Reload)

```

## API

Base URL: `http://localhost:8081/api`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/healthz` | Health check |
| `GET` | `/problems` | List all problems from PostgreSQL |
| `GET` | `/problems/{id}` | Get a problem by ID from PostgreSQL |
| `GET` | `/submissions` | List all submissions history |
| `POST` | `/submissions` | Submit code for judging |
| `GET` | `/submissions/{id}` | Poll submission result |

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

## Judge Design

Submissions are judged asynchronously after `POST /submissions` returns. A background goroutine runs the code and updates the stored submission in PostgreSQL once complete.

### Execution model

1. Code is written to a temp file (`os.CreateTemp`).
2. The language binary is invoked directly — **no shell** (`exec.Command(binary, file)`, never `sh -c`). This prevents shell injection.
3. Each test case is fed via stdin; stdout is captured and compared against the expected output (trailing whitespace trimmed).
4. The process is killed after **5 seconds** (`exec.CommandContext`) to handle infinite loops (TLE).
5. On Linux, `RLIMIT_AS` is set to 256 MB via `SysProcAttr` for memory limiting (MLE).

## Configuration

`configs/config.yaml` (environment variables override YAML values):

| YAML key | Env var | Default | Description |
| --- | --- | --- | --- |
| `port` | `PORT` | `8081` | HTTP listen port |
| `log_level` | `LOG_LEVEL` | `info` | `info` or `debug` |
| - | `DB_HOST` | `127.0.0.1` | PostgreSQL database host |

## Running (Docker Native Workflow)

The backend has migrated to a Docker Compose workflow to automatically provision the PostgreSQL database alongside the Go API.

### Start the entire stack (Recommended)

Make sure you are in the `backend/` directory:

```bash
# Build and start both PostgreSQL and Go API
docker-compose up --build

# To run in the background (detached mode)
docker-compose up -d --build

```

**Note on Database Initialization:** On the first run, the PostgreSQL container will automatically execute `db/init.sql` to create tables and seed default problems. If you need to reset the database, remove the volume:

```bash
docker-compose down -v
docker-compose up --build

```

## Port Map

| Service | Port |
| --- | --- |
| Backend API (this service) | 8081 |
| PostgreSQL Database | 5432 |
| Frontend (dev) | 5173 |
| Frontend (prod) | 8080 |

## CORS

The server allows all origins (`Access-Control-Allow-Origin: *`) and handles `OPTIONS` preflight requests, so the Vite dev server on port 5173 can call the API without proxy configuration.

```