# SMC Editor

## What this is

The frontend for **SMC**'s Online Code Test system. Vite + React 18 + TypeScript (strict), organised as a feature-based architecture with React Router, Zustand state, and an Axios client fully wired to the Go backend. The Monaco editor is the core feature, and we have recently expanded to include `auth`, `problems`, `submissions`, and an `interviewer` view.

## Current status

**Done**

- **Backend Integration (Live!)**: Replaced all static mock data. The frontend is now fully wired to the Go REST API. Problems and submission histories are dynamically fetched from the PostgreSQL database.
- **Interactive Submissions History**: Upgraded the `/submissions` page with an accordion UI. Users can expand rows to see detailed "Wrong Answer" diffs (Your Output vs Expected Output) and raw compilation/runtime error logs.
- **Modern Architecture**: Fully migrated to a 2025 "Feature-based" structure, separating logic into `/features`, `/pages`, and `/components`. Custom hooks are scoped precisely (e.g., workspace-specific hooks live in `features/workspace/hooks/`).
- **Resizable Workspace Layout**: Implemented a LeetCode-style 3-pane split view (Problem, Editor, Console) using `react-resizable-panels` (V4) for smooth, draggable layouts.
- **Global Theme Integration**: Synchronized Dark/Light mode across the entire workspace (Editor, Problem Description, Console, and Toolbar) using a centralized `THEME_CONFIG` and a dedicated `ThemeContext`.
- **Decoupled Editor**: `@monaco-editor/react` encapsulated as a standalone feature in `features/workspace/` with header chrome.
- **Language Support**: Switching across **JavaScript, Python, Go, C, C++** with specific skeletons for each.
- **Model Management**: Per-language skeletons seeded into Monaco models keyed by `path={solution.<lang>}` for clean buffer swapping and independent undo stacks.
- **UI Modernization**: Fully integrated Tailwind CSS for consistent, responsive, and dual-theme (Dark/Light) UI components (Cards, Pill Badges, Forms).
- **Docker Ready**: Multi-stage `Dockerfile` with explicit `lint`, `test`, `build`, and `runtime` targets. The final image uses `nginx:1.30-alpine-slim` for a tiny footprint (~8 MB).

**Not done yet**

- **Real-time Execution Status**: Implement WebSocket or Polling to show live "Judging..." status updates without requiring a page refresh.
- All Tier A/B feature ideas listed below remain open.

---

## Current Routes

The application uses **React Router v7** with a centralized layout (`MainLayout`). Here are the currently implemented routes and their purposes:

- `/` **(Home)**: The landing page containing the `LoginForm`. Used by candidates to enter their interview credentials and access the system.
- `/problems` **(ProblemList)**: A dashboard listing all available coding problems with their difficulty levels fetched from the DB. Candidates select a problem here to start coding.
- `/workspace/:problemId` **(Workspace)**: The core interview interface. A 3-pane layout containing the markdown problem description, the Monaco code editor, and the console/output panel.
- `/submissions` **(SubmissionsPage)**: A history table showing all code executions with an expandable accordion to view diffs and error logs.
- `/interviewer` **(InterviewerPage)**: A dedicated portal for interviewers to generate temporary credentials, monitor candidate progress, and manage the interview session.

---

## How to run

> 💡 **Prerequisite:** Ensure the Go backend and PostgreSQL database are running via Docker Compose (`localhost:8081`) before starting the frontend to fetch real data.

There are two ways to run the editor: a fast dev loop (Vite HMR) and a production-shaped Docker build.

### 1. local dev server

```bash
cd SMC/frontend
npm install
npm run dev          # http://localhost:5173

```

Useful checks while editing:

```bash
npx tsc --noEmit     # type-check the project (must pass clean)
npm run build        # produce a production bundle in dist/
npm run preview      # serve dist/ locally
npm run format:check # prettier check

```

### 2. Docker

Run from `SMC/frontend/` (the folder that contains `docker-compose.yaml`):

```bash
cd SMC/frontend
docker compose up --build      # builds the image, starts nginx on :8080
# open http://localhost:8080

```

Other handy commands:

```bash
docker compose up -d --build           # detached
docker compose logs -f frontend        # tail logs
curl -sI http://localhost:8080         # 200 OK, Server: nginx
curl -s  http://localhost:8080/healthz # "ok"
docker compose down                    # stop + remove the container
docker images smc-frontend:dev         # built image (~50 MB)

```

What `docker compose up --build` does, end to end:

1. Reads `docker-compose.yaml` → service `frontend`, build context `.` (the `frontend/` folder).
2. Stage `depends`: install dependencies once (`npm ci`).
3. Stage `source`: copy the app source on top of the dependency layer.
4. Stage `build`: `npm run build` → `/frontend/dist` (lint/test targets are available for CI and are no-ops if scripts are missing).
5. Stage `runtime`: copies `dist/` into `nginx:1.30-alpine-slim` and copies `nginx.conf` to `/etc/nginx/conf.d/default.conf`.
6. Tags the image `smc-frontend:dev` (local-build tag — distinct from CI's `cn18smc/frontend:*`) and runs it with port `8080:80`.

### Reproduce CI locally (lint / test / build stages)

CI calls the Dockerfile stages by name; you can run the same commands to debug a CI failure:

```bash
cd /frontend
docker buildx build --progress=plain --target lint .
docker buildx build --progress=plain --target test .
docker buildx build --progress=plain --target format .
docker buildx build --progress=plain --target runtime -t smc-frontend:dev .

```

### If the Format police screams

Run the docker command below to fix the issues from the Prettier police:

```bash
cd SMC/frontend
docker run --rm -v "$PWD":/frontend -w /frontend node:22-alpine \
  sh -c "npm ci && npm run format:write"

```

### Check the runtime image for CVEs

The runtime stage runs `apk upgrade` on every CI build, with the `APK_CACHE_BUST` build-arg set per run so the upgrade layer never reuses stale cache. To verify locally and re-run a Docker Scout / Trivy scan:

```bash
cd SMC/frontend
docker buildx build --pull --no-cache-filter=runtime \
  --build-arg APK_CACHE_BUST="$(date +%s)" \
  --target runtime -t smc-frontend:dev --load .

docker scout cves smc-frontend:dev      # or: trivy image smc-frontend:dev

```

## File map

```text
SMC/frontend/
├── README.md              # this file (handover)
├── docker-compose.yaml    # one service: `frontend`, builds ., exposes :8080
├── Dockerfile             # multi-stage: depends → source → lint/test/build → runtime
├── nginx.conf             # /assets cache, /healthz
├── package.json
├── vite.config.ts
├── tailwind.config.js     # Tailwind CSS configuration
└── src/
    ├── main.tsx           # React root, <StrictMode>
    ├── App.tsx            # Router root (React Router v7)
    ├── components/Common/ # Dumb UI atoms (Button, Modal, ResizeHandle, …)
    ├── contexts/          # Global Context Providers (e.g., ThemeContext)
    ├── features/          # Vertical slices — the heart of SMC
    │   ├── auth/          # LoginForm + useAuth
    │   ├── problems/      # ProblemDescription, ProblemList UI (Wired to DB)
    │   ├── submissions/   # Accordion history table and status badges (Wired to DB)
    │   └── workspace/     # CodeEditor, EditorToolbar, ConsolePanel, hooks/
    ├── pages/             # Route-level shells
    │   ├── Home/          # Route: /
    │   ├── interviewer/   # Route: /interviewer
    │   ├── ProblemList/   # Route: /problems
    │   ├── Submissions/   # Route: /submissions
    │   └── Workspace/     # Route: /workspace/:problemId
    ├── layouts/           # Shared chrome (MainLayout with <Outlet/>, Navbar)
    ├── services/          # apiClient.ts — single shared Axios instance
    ├── store/             # globalStore.ts — cross-feature Zustand state
    ├── hooks/             # Cross-feature global hooks (useDebounce, …)
    ├── types/             # TS interfaces mapped strictly to Go backend structs
    └── styles/globals.css # Global CSS & Tailwind directives

```

## Architecture

The system has moved from a monolithic component to a modular, decoupled architecture:

- **Component Decoupling**: The UI is split into **Dumb Components** (UI-only in `src/components`) and **Smart Components** (logic-heavy in `src/features`).
- **Feature-based Hooks**: Hooks specific to a domain (like editor execution logic) are co-located within `src/features/*/hooks/`, maintaining high cohesion and avoiding global hook clutter.
- **State Management**: Uses **Zustand** for lightweight and robust state management instead of complex Prop drilling. Contexts (`src/contexts`) are used for pure UI-state like Themes.
- **Backend Ready**: Interfaces in `src/types/` are designed to exactly match the **Go backend** structs, ensuring type safety from the database all the way to the browser DOM.

```

```
