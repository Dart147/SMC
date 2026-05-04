# SMC

## What this is

Show Me your Code (SMC) is an Online Code Test platform: interviewees take coding tests in the browser, and hiring managers create tests, manage candidates, and review results.

## Repository layout

```
SMC/
├── frontend/   # browser apps.
├── backend/    # API + grader services — TBD
└── infra/      # docker-compose / Traefik / observability — TBD
```


## Frontend (current)

A standalone localhost POC of the in-browser code editor: a single-page **Vite + React 18 + TypeScript** app built around `@monaco-editor/react`. Currently supports five languages (JavaScript, Python, Go, C, C++), a dark / light theme toggle, and per-language Monaco models so each language keeps its own buffer and undo stack. In production-shape it is built statically and served by `nginx:1.27-alpine` from a multi-stage Docker build, runnable via `docker compose up --build` from `frontend/Editor/` on `http://localhost:8080`. For fast iteration there is also a Vite dev server on `http://localhost:5173`.

For setup, dev commands, Docker workflow, file map, and conventions, see **[`frontend/Editor/README.md`](frontend/Editor/README.md)**

## Backend

**TBD.** Will host the HTTP API and the async grader workers that accept submissions and run them in sandboxed containers.

## Infra

**TBD.** Will hold the unified `docker-compose` / Traefik / observability configuration that ties the frontend, backend, and supporting services together for the single-host deployment.