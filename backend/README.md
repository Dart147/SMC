# SMC Backend

REST API server for the **Show Me your Code** online coding interview platform. Serves problems and accepts code submissions.

## Stack

| Concern | Choice |
|---|---|
| Language | Go 1.24 |
| HTTP routing | `net/http` (Go 1.22 pattern-based mux) |
| Logging | `go.uber.org/zap` |
| Config & seed data | `gopkg.in/yaml.v3` |
| Storage | In-memory (`sync.RWMutex`-guarded maps) |

## Project Layout

```
backend/
├── cmd/api/          # Binary entry point (main.go)
├── internal/
│   ├── config/       # YAML + env config loading
│   ├── domain/       # Core types: Problem, Submission
│   ├── handler/      # HTTP handlers
│   ├── middleware/   # CORS
│   ├── repository/   # In-memory data stores
│   └── service/      # Business logic
├── api/
│   └── problems.yaml # Seed data (loaded at startup)
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
| `POST` | `/submissions` | Submit code |
| `GET` | `/submissions/{id}` | Get a submission by ID |

### POST /submissions

Request body:

```json
{
  "problemId": "1",
  "code": "print('hello')",
  "language": "python"
}
```

Supported `language` values: `python`, `javascript`, `go`, `c`, `cpp`

Response (201):

```json
{
  "id": "a3f8c2d1e4b5f6a7",
  "problemId": "1",
  "code": "print('hello')",
  "language": "python",
  "status": "Pending"
}
```

> **Note:** Code execution is not yet implemented. All submissions return `status: "Pending"` immediately.

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
