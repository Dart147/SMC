# SMC System Architecture

```mermaid
graph TD
    Browser["Browser"]

    subgraph FrontendContainer["Frontend Container"]
        Nginx["Nginx\n(serves React SPA\n+ reverse proxy /api/*)"]
    end

    subgraph BackendContainer["Backend Container (single Go binary)"]
        HTTPServer["HTTP Server\n(single router, JWT + role middleware)"]

        subgraph CandidateRoutes["Candidate Routes"]
            CR1["GET /api/problems\nGET /api/problems/:id\nGET /api/my-problems"]
            CR2["POST /api/submissions\nGET /api/submissions\nGET /api/submissions/:id"]
            CR3["POST /api/exams/start\nPOST /api/exams/warn\nPOST /api/exams/end"]
            CR4["POST /api/run  (sample judge)"]
        end

        subgraph AdminRoutes["Admin Routes  (role: admin)"]
            AR1["POST/DELETE/PUT /api/problems/:id\nGET /api/admin/problems/:id"]
            AR2["POST /api/users\nGET /api/interviewer/candidates"]
            AR3["GET /api/admin/candidates/scores\nGET /api/submissions/:id/report"]
        end

        Metrics["GET /metrics\n(Prometheus)"]

        WorkerPool["Worker Pool\n(goroutines, same process)\nClaimNext → judge → Update DB"]
    end

    subgraph JudgeLayer["Judge (Docker socket, production)"]
        DockerRunner["DockerRunner\n(/var/run/docker.sock)"]
        C1["Container\n(submission 1)"]
        C2["Container\n(submission 2)"]
        Cdots["..."]
    end

    DB[("PostgreSQL")]

    Browser --> Nginx
    Nginx -->|"proxy /api/*"| HTTPServer
    HTTPServer --> CandidateRoutes
    HTTPServer --> AdminRoutes
    HTTPServer --> Metrics
    HTTPServer --> DB
    WorkerPool -->|"poll pending submissions"| DB
    WorkerPool --> DockerRunner
    DockerRunner --> C1
    DockerRunner --> C2
    DockerRunner --> Cdots
```

## Notes

- **Single binary**: The HTTP server and worker pool run in the same Go process. There is no separate orchestrator service.
- **Role-based routing**: "Candidate" and "Admin" are not separate services — they are route groups within one router, protected by `RequireRole("admin")` middleware.
- **Judge backend**: `JUDGE_BACKEND=docker` in all compose files. `ProcessRunner` is a fallback for bare `go run` without a `.env` and is not used in any deployed environment.
- **Judge queue**: Backed by the `submissions` table in PostgreSQL (status: `pending → running → done`). No separate message queue.
- **Nginx**: Lives in the frontend container only. There is no separate API gateway.
