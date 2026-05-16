# SMC Backend

REST API server for the **Show Me your Code** online coding interview platform. Serves problems and judges code submissions.

## Stack

| Concern | Choice |
|---|---|
| Language | Go 1.24 |
| HTTP routing | `net/http` (Go 1.22 pattern-based mux) |
| Logging | `go.uber.org/zap` |
| Config & seed data | `gopkg.in/yaml.v3` |
| Storage | In-memory (`sync.RWMutex`-guarded maps) |
| Code execution | `os/exec` subprocess per language |

## Project Layout

```
backend/
├── cmd/api/          # Binary entry point (main.go)
├── internal/
│   ├── config/       # YAML + env config loading
│   ├── domain/       # Core types: Problem, TestCase, Submission
│   ├── handler/      # HTTP handlers
│   ├── judge/        # Code execution engine + memory-limit build tags
│   ├── middleware/   # CORS
│   ├── repository/   # In-memory data stores
│   └── service/      # Business logic + async judge dispatch
├── api/
│   └── problems.yaml # Seed data with test cases (loaded at startup)
└── configs/
    └── config.yaml   # Default configuration
```

## API

Base URL: `http://localhost:8081/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `GET` | `/problems` | List all problems |
| `GET` | `/problems/{id}` | Get a problem by ID |
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

### GET /submissions/{id} — polling for the result

Poll this endpoint after submitting. The judge runs asynchronously and updates the status once complete.

```json
{
  "id": "a3f8c2d1e4b5f6a7",
  "problemId": "1",
  "language": "python",
  "status": "Accepted",
  "passedTestCases": 3,
  "totalTestCases": 3
}
```

#### Submission statuses

| Status | Meaning |
|---|---|
| `Pending` | Queued or running |
| `Accepted` | All test cases passed |
| `Wrong Answer` | Output did not match expected |
| `Time Limit Exceeded` | Process did not finish within 5 s |
| `Memory Limit Exceeded` | Process exceeded 256 MB (Linux only) |
| `Runtime Error` | Process exited non-zero |
| `Compile Error` | Compilation failed before execution (Go only) |

On failure, the response also includes:
- `"output"` — actual stdout of the failing test case (WA and RE)
- `"expectedOutput"` — expected stdout for comparison (WA only)
- `"error"` — human-readable failure description or stderr (RE, CE, TLE, MLE)

## Judge Design

Submissions are judged asynchronously after `POST /submissions` returns. A background goroutine runs the code and updates the stored submission once complete.

### Execution model

1. Code is written to a temp file (`os.CreateTemp`).
2. The language binary is invoked directly — **no shell** (`exec.Command(binary, file)`, never `sh -c`). This prevents shell injection.
3. Each test case is fed via stdin; stdout is captured and compared against the expected output (trailing whitespace trimmed).
4. The process is killed after **5 seconds** (`exec.CommandContext`) to handle infinite loops (TLE).
5. On Linux, `RLIMIT_AS` is set to 256 MB via `SysProcAttr` for memory limiting (MLE). On macOS the limit is not enforced at the OS level; Docker is the planned next step.

### Congestion control

A buffered-channel semaphore (`make(chan struct{}, 4)`) caps concurrent executions at **4**. Additional goroutines block until a slot frees rather than being rejected. Temporal workflow queuing is the planned replacement for production scale.

### Test cases

Test cases are defined in `api/problems.yaml` using stdin/stdout format:

```yaml
test_cases:
  - input: "2 7 11 15\n9\n"
    expected_output: "0 1\n"
```

Problems without test cases receive `Accepted` immediately (for dev).

## Configuration

`configs/config.yaml` (environment variables override YAML values):

| YAML key | Env var | Default | Description |
|---|---|---|---|
| `port` | `PORT` | `8081` | HTTP listen port |
| `log_level` | `LOG_LEVEL` | `info` | `info` or `debug` |
| `seed_file` | `SEED_FILE` | `api/problems.yaml` | Path to problem seed data |

## Running

### Local

```bash
# Install dependencies
go mod download

# Run (uses configs/config.yaml)
make run

# Or build a binary first
make build
./bin/api
```

### Docker

```bash
docker build -t smc-backend .
docker run -p 8081:8081 smc-backend
```

## Development

```bash
make tidy    # tidy go.mod
make test    # run all tests
make build   # compile to bin/api
make run     # run without building
```

## Port Map

| Service | Port |
|---|---|
| Backend API (this service) | 8081 |
| Frontend (dev) | 5173 |
| Frontend (prod) | 8080 |
| CD deploy service | 7082 |
| Temporal UI | 7080 |

## CORS

The server allows all origins (`Access-Control-Allow-Origin: *`) and handles `OPTIONS` preflight requests, so the Vite dev server on port 5173 can call the API without proxy configuration.
