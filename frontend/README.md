# SMC Editor (Frontend)

## What this is

The frontend for **SMC**'s Online Code Test system. Vite + React 18 + TypeScript (strict), organised as a feature-based architecture with React Router, Zustand state, and an Axios client fully wired to the Go backend. The Monaco editor is the core feature, and we have recently expanded to include real authentication (`auth`), dynamic `problems`, `submissions`, a secure `interviewer` dashboard, and a **comprehensive browser-based Anti-Cheat system**.

## Current status

**Done**

- **Enterprise-Grade Authentication 🔐**: Replaced all static mock data and insecure `localStorage` credential generation. The frontend is now fully wired to the Go REST API using **JWT (JSON Web Tokens)** for secure, session-based authentication.
- **Strict Anti-Cheat System & 3-Strike Rule 🚨**: Implemented a global `useAntiCheat` hook that strictly monitors candidate behavior. It detects tab switching, window resizing, and exits from full-screen mode across all major browsers. Violations trigger an immediate blocking overlay. If a candidate reaches **3 violations**, the frontend forces an automatic exam submission, purges the local token, and permanently kicks the user out.
- **Secure Exam Flow & Fullscreen Enforcement 🖥️**: Candidates must read and accept a pre-exam disclaimer to enter a forced full-screen mode. All exam routes are wrapped inside an `ExamLayout` that guarantees the anti-cheat listeners and the blocking modal are always active during the test.
- **Early Submission**: Added a floating action button for candidates to manually submit their exams early, which accurately logs the completion time to the backend and revokes their JWT session.
- **Time-Bound Exam Sessions ⏳**: Implemented a secure 3-hour countdown timer for candidates. The frontend decodes the JWT to retrieve the `exam_expires_at` claim, rendering a live, pulsating global timer. If the time expires, or if the backend returns a `403 Forbidden` (e.g., already submitted), the user is gracefully redirected to the login screen with a clear expiration message.
- **Token Persistence & Interceptors**: Auto-attaches the JWT token to all outgoing Axios requests via interceptors for protected routes.
- **Secure Interviewer Dashboard 👨‍💼**: Role-Based Access Control (RBAC) ensures only users with the `admin` role can access the `/interviewer` route. The dashboard allows interviewers to generate real, DB-backed candidate accounts secured via Bcrypt and Blind Indexing. Includes a highly secure, session-bound history table to safely display and copy one-time plaintext credentials without persisting them.
- **Backend Integration (Live!)**: Problems and submission histories are dynamically fetched from the PostgreSQL database. Error handling now correctly intercepts standard HTTP statuses (e.g., 401 Unauthorized, 403 Forbidden, 404 Not Found) to provide precise user feedback.
- **Interactive Submissions History**: Upgraded the `/submissions` page with an accordion UI. Users can expand rows to see detailed "Wrong Answer" diffs (Your Output vs Expected Output) and raw compilation/runtime error logs.
- **Modern Architecture**: Fully migrated to a 2025 "Feature-based" structure, separating logic into `/features`, `/pages`, and `/components`. Custom hooks are scoped precisely.
- **Resizable Workspace Layout**: Implemented a LeetCode-style 3-pane split view (Problem, Editor, Console) using `react-resizable-panels` (V4) for smooth, draggable layouts.
- **Global Theme Integration**: Synchronized Dark/Light mode across the entire workspace (Editor, Problem Description, Console, and Toolbar).
- **Decoupled Editor**: `@monaco-editor/react` encapsulated as a standalone feature in `features/workspace/` with header chrome.
- **Language Support**: Switching across **JavaScript, Python, Go, C, C++** with specific skeletons for each.
- **UI Modernization**: Fully integrated Tailwind CSS for consistent, responsive, and dual-theme (Dark/Light) UI components (Cards, Pill Badges, Forms).
- **Docker Ready**: Multi-stage `Dockerfile` with explicit `lint`, `test`, `build`, and `runtime` targets. The final image uses `nginx:1.30-alpine-slim` for a tiny footprint (~8 MB).

**Not done yet**

- **Real-time Execution Status**: Implement WebSocket or Server-Sent Events (SSE) to show live "Judging..." status updates without requiring a page refresh.

---

## Current Routes

The application uses **React Router v7** with a robust, nested layout strategy to separate public, admin, and strictly monitored exam spaces:

- `/` **(Home/Traffic Cop)**: The root path that handles immediate redirection based on authentication state.
- `/login` **(Login)**: A clean, full-screen authentication page wired to the Go backend.
- `/disclaimer` **(DisclaimerPage)**: A pre-exam waiting room where candidates must accept the rules and grant Full-Screen permissions to begin.
- **Exam Area (Protected by `ExamLayout` & Anti-Cheat):**
  - `/problems` **(ProblemList)**: A dashboard listing all available coding problems fetched from the DB.
  - `/workspace/:problemId` **(Workspace)**: The core interview interface. A 3-pane layout containing the markdown problem description, the Monaco code editor, and the console/output panel.
  - `/submissions` **(SubmissionsPage)**: A history table showing all code executions with expandable diffs.
- `/interviewer` **(Interviewer Dashboard)**: An RBAC-protected portal strictly for admins. Interviewers can generate secure candidate credentials and monitor the live count of candidates. (Exempt from Anti-Cheat rules).

---

## How to run

> **Prerequisite:** Ensure the Go backend and PostgreSQL database are running via Docker Compose (`localhost:8081`) before starting the frontend to fetch real data and authenticate successfully.

There are two ways to run the editor: a fast dev loop (Vite HMR) and a production-shaped Docker build.

### 1. Local dev server

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
    │   ├── auth/          # LoginForm + useAuth (JWT parsing, Auth & Timer state)
    │   ├── problems/      # ProblemDescription, ProblemList UI (Wired to DB)
    │   ├── submissions/   # Accordion history table and status badges (Wired to DB)
    │   └── workspace/     # CodeEditor, EditorToolbar, ConsolePanel, hooks/
    ├── pages/             # Route-level shells
    │   ├── Login/         # Route: /login
    │   ├── DisclaimerPage/# Route: /disclaimer (Full-screen entry gateway)
    │   ├── Home/          # Route: / (Redirect logic)
    │   ├── interviewer/   # Route: /interviewer
    │   ├── ProblemList/   # Route: /problems
    │   ├── Submissions/   # Route: /submissions
    │   └── Workspace/     # Route: /workspace/:problemId
    ├── layouts/           # Shared chrome wrappers
    │   ├── MainLayout.tsx # Navigation bar and global layout
    │   └── ExamLayout.tsx # Anti-cheat wrapper, blocking modals, and early submit logic
    ├── services/          # apiClient.ts — single shared Axios instance (API Base: /api)
    ├── store/             # globalStore.ts — cross-feature Zustand state
    ├── hooks/             # Cross-feature global hooks (useAntiCheat, useDebounce, …)
    ├── types/             # TS interfaces mapped strictly to Go backend structs
    └── styles/globals.css # Global CSS & Tailwind directives

```

## Architecture

The system has moved from a monolithic component to a modular, decoupled architecture:

* **Component Decoupling**: The UI is split into **Dumb Components** (UI-only in `src/components`) and **Smart Components** (logic-heavy in `src/features`).
* **Feature-based Hooks**: Hooks specific to a domain (like editor execution logic) are co-located within `src/features/*/hooks/`, maintaining high cohesion and avoiding global hook clutter.
* **State Management**: Uses **Zustand** for lightweight and robust state management instead of complex Prop drilling. Contexts (`src/contexts`) are used for pure UI-state like Themes.
* **Backend Ready**: Interfaces in `src/types/` are designed to exactly match the **Go backend** structs, ensuring type safety from the database all the way to the browser DOM. API requests are routed through a centralized `apiClient.ts` to seamlessly handle base URLs and authentication tokens.

```