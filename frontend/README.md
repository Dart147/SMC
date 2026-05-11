# SMC Editor

## What this is

The frontend for **SMC**'s Online Code Test system. Vite + React 18 + TypeScript (strict), organised as a feature-based architecture with React Router, Zustand state, and an Axios client ready to wire to the Go backend. The Monaco editor is the only fully-implemented feature today; `auth` and `problems` features are scaffolded and waiting for endpoints.

## Current status

**Done**

- **Modern Architecture**: Fully migrated to a 2025 "Feature-based" structure, separating logic into `/features`, `/pages`, and `/components`.
- **Decoupled Editor**: `@monaco-editor/react` encapsulated as a standalone feature in `features/workspace/` with header chrome.
- **Language Support**: Switching across **JavaScript, Python, Go, C, C++** with specific skeletons for each.
- **Theme Toggle**: Support for dark and light modes.
- **Model Management**: Per-language skeletons seeded into Monaco models keyed by `path={solution.<lang>}` for clean buffer swapping and independent undo stacks.
- **Docker Ready**: Multi-stage `Dockerfile` with explicit `lint`, `test`, `build`, and `runtime` targets. The final image uses `nginx:1.30-alpine-slim` for a tiny footprint (~8 MB).

**Not done yet**

- `auth`, `problems`, and the run-code path are scaffolded but not wired to a live backend.
- All Tier A/B feature ideas listed below remain open.

## How to run

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

If you change source files and want a fresh image, re-run with `--build`. The `.dockerignore` keeps `node_modules`, `dist`, `.git`, etc. out of the build context so rebuilds stay fast.

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

Run the docker command below to fix the issues from the Prettier police

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

```
SMC/frontend/
├── README.md              # this file (handover)
├── docker-compose.yaml    # one service: `frontend`, builds ., exposes :8080 (local tag: smc-frontend:dev)
├── Dockerfile             # multi-stage: depends → source → lint/test/build → runtime
├── nginx.conf             # /assets cache, /healthz
├── .dockerignore          # excludes node_modules / dist / .git
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx           # React root, <StrictMode>
    ├── App.tsx            # Router root (React Router v7)
    ├── components/Common/ # Dumb UI atoms (Button, Modal, …)
    ├── features/          # Vertical slices — the heart of SMC
    │   ├── auth/          # api.ts + LoginForm + useAuth
    │   ├── problems/      # api.ts + ProblemRenderer
    │   └── workspace/     # api.ts + store.ts + CodeEditor/EditorToolbar/ConsoleOutput + useRunCode
    ├── pages/             # Route-level shells: Home, ProblemList, Workspace
    ├── layouts/           # Shared chrome (MainLayout with <Outlet/>)
    ├── services/          # apiClient.ts — single shared Axios instance
    ├── store/             # globalStore.ts — cross-feature Zustand state
    ├── hooks/             # Cross-feature hooks (useDebounce, …)
    ├── types/             # TS interfaces mapped to Go backend structs
    ├── config/            # Env-driven config (API base URL, …)
    ├── utils/             # Pure helpers (format, …)
    ├── styles/globals.css # Global CSS
    └── assets/            # Static assets (images, …)

```

## Architecture

The system has moved from a monolithic component to a modular, decoupled architecture:

- **Component Decoupling**: The UI is split into **Dumb Components** (UI-only in `src/components`) and **Smart Components** (logic-heavy in `src/features`).
- **State Management**: Uses **Zustand** for lightweight and robust state management instead of complex Prop drilling.
- **Uncontrolled Editor**: The editor uses `defaultValue` and a `path` prop to allow Monaco to manage its own models natively.
- **Backend Ready**: Interfaces in `src/types/` are designed to match the **Go backend** structs to ensure type safety across the stack.

### Build pipeline (multi-stage Dockerfile)

The Dockerfile splits cleanly into a **build-time** image and a **runtime** image. The build image has Node, npm, and the full source tree; the runtime image has only nginx and the compiled static bundle.

```
  node:22-alpine  →  depends → source → lint / test / build   (BUILD-TIME ONLY)
                                                ↓
                                         /frontend/dist  (just static HTML/JS/CSS)
                                                ↓
  nginx:1.30-alpine-slim  →  runtime   ← COPY --from=build /frontend/dist
```

Why this matters:

- **Only `/frontend/dist` crosses into the runtime image.** No `node`, no `npm`, no `node_modules`, no build-time Alpine packages. The published image is ~8 MB and contains 32 packages.
- **Lint and test are separate stages off `source`.** CI calls them by name (`docker buildx build --target lint`), so the toolchain lives in one place and the workflow YAML stays thin.

### Tech Stack

| Layer         | Choice                            | Notes                                                                          |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| Build tool    | Vite 5                            | Fast HMR, no SSR (Monaco hates SSR)                                            |
| Framework     | React 18                          | Wider compatibility with `@monaco-editor/react` than 19 today                  |
| Language      | TypeScript 5 (strict)             | `noUnusedLocals`, `noUnusedParameters` on                                      |
| Editor        | `@monaco-editor/react` 4.x        | Wraps `monaco-editor`; handles loader/AMD config                               |
| Styling       | `src/styles/globals.css` + inline | No CSS framework yet                                                           |
| State         | **Zustand** 5                     | Global store in `src/store/`, per-feature stores in `src/features/*/store.ts`  |
| Routing       | **React Router** v7               | Configured in `src/App.tsx` with `MainLayout` shell                            |
| HTTP          | **Axios**                         | Single instance in `src/services/apiClient.ts`; feature `api.ts` files wrap it |
| Runtime image | `nginx:1.30-alpine-slim`          | Static SPA serving; no Node at runtime                                         |

## Suggested follow-up features

### Tier A — small wins, suggested order

1. **Keyboard shortcut for "Submit" (no-op for now).** `editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, …)` so the muscle memory is wired now and the no-op gets replaced with a real `fetch` later. Validates the `onMount` plumbing.
2. **Disable the right-click context menu** (`contextmenu: false`). Removes the Command Palette → Open File side-channel. One-line anti-cheat improvement.
3. **Mobile / small-viewport notice.** Render a "please use a desktop browser" panel below ~768 px instead of a broken Monaco. Monaco officially does not support mobile.
4. **Font size +/− buttons in the header.** Trivial useState; demos well; candidates routinely ask for this.
5. **Reset-to-skeleton button.** Calls `editorRef.current.setValue(SKELETONS[language])`. Useful for the demo loop and the candidate flow.

### Tier B — slightly more, but still no backend

6. **Draft autosave to `localStorage`** keyed by `language`. Survives accidental refreshes. Use `draft/<language>` so it doesn't collide with future `submissions/<id>` entries.
7. **Read-only "header" region inside the editor.** Lock the function signature so the candidate can't change the entry point the grader will call. Implementation: `monaco.editor.IModelDeltaDecoration` + an `onDidChangeModelContent` guard that reverts edits intersecting lines 1..N of the skeleton. This most influences the eventual grader contract; worth de-risking now.
8. **Run-button stub with disabled tooltip.** Visible Run button that's `disabled` with tooltip "Grading runs server-side; results are reviewed by your interviewer." Trains the candidate flow correctly and surfaces the domain rule that candidates never see scores.
9. **In-browser JS execution** (only for `javascript`) using a sandboxed `iframe srcdoc` or a Web Worker. **Demo aid only, not a grader.** Lets us show "code → output" round-trips on day one. Only build it if explicitly labelled "demo only, not a grader" — Python / Go / C / C++ stay disabled.

### Tier C — useful but probably belongs to a later phase

10. Multi-tab / multi-file editor.
11. Vim / Emacs keybindings via `monaco-vim` or `monaco-emacs`.
12. Custom theme matching the eventual product brand.
13. Live collaboration (Yjs + monaco-yjs) — high wow-factor but irrelevant for a solo test-taker.
14. Linting / type-checking for non-built-in languages. Monaco only ships TS/JS/CSS/HTML/JSON language services; Python or Go diagnostics need a Language Server (LSP), which by definition needs a backend.

## Conventions to keep

- **Feature-based layout.** New code goes next to the feature it belongs to (`features/<feature>/components/Foo.tsx`), not into a global `components/`. Reserve `src/components/Common/` for reusable dumb atoms.
- **Features don't cross-import internals.** Compose features at the page level or lift to `src/store/globalStore.ts`.
- **One Axios instance.** All HTTP goes through `src/services/apiClient.ts`; feature `api.ts` files wrap it. No `fetch` scattered through components.
- **Types mirror the Go backend.** Keep `src/types/` aligned with backend structs as the API lands.
- **Uncontrolled Monaco editor.** Use `defaultValue` + `path`-keyed models. Do not switch to a controlled `value` prop — it forces re-renders on every keystroke and breaks Monaco's native undo.
- **Language IDs are lowercase Monaco IDs** (`javascript`, `python`, `go`, `c`, `cpp`). The `Language` type, `SKELETONS` keys, and toolbar `<option value>` strings must all match.
- **No secrets** in this folder. API base URL goes through `src/config/`.
- **No `console.log`** in committed code.
- **TypeScript strict.** `npx tsc --noEmit` should pass clean before any edit is considered done.
- **Mobile is not supported.** Don't add mobile-specific styling that suggests otherwise.
- **Docker runtime stays static-built + nginx.** Do not switch the runtime image to `node` or run `vite dev` inside the container — that's not how the MVP will deploy.
- **Dockerfile is the toolchain.** Lint / test / build are stages off `source`. CI calls them via `docker buildx build --target <stage>`. Adding a new check = a new Dockerfile stage, not a new YAML step.
