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
| `GET` | `/version` | Returns the commit ID and build version |
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

## Testing the API

Quick end-to-end check after `docker compose up -d --build`. Run from any shell on the host. `jq` is optional pretty-printing — drop it if you don't have it.

### 1. Health

```bash
curl -s http://localhost:8081/api/healthz
# → {"status":"ok"}
```

### 2. Version

```bash
curl -s http://localhost:8081/api/version
# → {"commit":"dev","version":"dev"}   (locally built)
# → {"commit":"<sha>","version":"pr-N"}  (CI-built image)
```

A 404 here means the running container is an older image — rebuild with `docker compose up -d --build backend`.

### 3. Problems

```bash
curl -s http://localhost:8081/api/problems | jq .
curl -s http://localhost:8081/api/problems/1 | jq .
```

The list should contain the seeded problems from `db/init.sql`. An empty array means the DB volume was preserved from a previous run and `init.sql` did not re-seed.

### 4. Submit code and watch it judge

Two steps because judging runs asynchronously: POST returns immediately with `"status":"Pending"`, then poll the GET endpoint until it settles.

**Step 4a — submit.**

```bash
cat > /tmp/sub.json <<'EOF'
{
  "problemId": "1",
  "language": "python",
  "code": "nums=list(map(int,input().split()))\nt=int(input())\nfor i,a in enumerate(nums):\n  for j in range(i+1,len(nums)):\n    if a+nums[j]==t:\n      print(i,j); exit()"
}
EOF

curl -s -X POST http://localhost:8081/api/submissions \
  -H 'Content-Type: application/json' \
  -d @/tmp/sub.json | jq .
```

The response includes an `id`. Copy it.

**Step 4b — poll.** Replace `<ID>` with the id from step 4a:

```bash
ID=<ID>
while :; do
  out=$(curl -s http://localhost:8081/api/submissions/$ID)
  status=$(echo "$out" | jq -r .status)
  echo "$status"
  [ "$status" != "Pending" ] && echo "$out" | jq . && break
  sleep 0.5
done
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
docker run --rm -v "$PWD":/app -w /app golang:1.26-alpine gofmt -l .
```

### Running the GitHub Actions workflows locally

The `docker buildx` commands above only run the individual Dockerfile stages. To test `backend-pre-commit.yaml`, `backend-snapshot.yaml`, or `backend-dev.yaml`, run the workflow end-to-end with [`act`](https://github.com/nektos/act)

**Run a workflow**

```bash
# Pre-commit (push to a non-main branch)
act push -W .github/workflows/backend-pre-commit.yaml

# Snapshot (PR to main)
act pull_request -W .github/workflows/backend-snapshot.yaml

# Dev (merge to main)
act push -W .github/workflows/backend-dev.yaml
```

The first run downloads a ~1 GB runner image.

**For steps that need secrets** (the Docker Hub login in snapshot/dev), put them in a gitignored `.secrets` file at the repo root:

```
DOCKER_REGISTRY_USERNAME=your-dockerhub-username
DOCKER_REGISTRY_TOKEN=your-dockerhub-access-token
```

then add `--secret-file .secrets` to the `act` command.

**Skip pushing locally:**

```bash
act pull_request -W .github/workflows/backend-snapshot.yaml --env ACT=true
```

## CORS

The server allows all origins (`Access-Control-Allow-Origin: *`) and handles `OPTIONS` preflight requests, so the Vite dev server on port 5173 can call the API without proxy configuration.

```