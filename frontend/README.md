# SMC Editor

## What this is

A standalone localhost POC of the in-browser code editor for **SMC**'s Online Code Test system. It is a single-page Vite + React + TypeScript app that mounts a Monaco editor with a language switcher and a theme toggle — deliberately the smallest demo-able artifact: one screen, one editor, no backend.

## Current status

**Done**

* **Modern Architecture**: Fully migrated to a 2025 "Feature-based" structure, separating logic into `/features`, `/pages`, and `/components`.
* **Decoupled Editor**: `@monaco-editor/react` encapsulated as a standalone feature in `features/workspace/` with header chrome.
* **Language Support**: Switching across **JavaScript, Python, Go, C, C++** with specific skeletons for each.
* **Theme Toggle**: Support for dark and light modes.
* **Model Management**: Per-language skeletons seeded into Monaco models keyed by `path={solution.<lang>}` for clean buffer swapping and independent undo stacks.
* **Docker Ready**: Multi-stage `Dockerfile` with explicit `lint`, `test`, `build`, and `runtime` targets. The final image uses `nginx:1.30-alpine-slim` for a tiny footprint (~8 MB).

**Not done yet**

- No tests. v0 is small enough that the demo script *is* the test; tests get added when the editor merges into the full stack.
- No CI integration — building / deploying still runs from a developer laptop.
- All Tier A/B feature ideas listed below remain open.

## How to run

There are two ways to run the editor: a fast dev loop (Vite HMR) and a production-shaped Docker build.

### Option A — local dev server (fast iteration)

```bash
cd SMC/frontend/Editor/app
npm install
npm run dev          # http://localhost:5173
```

Useful checks while editing:

```bash
npx tsc --noEmit     # type-check the project (must pass clean)
npm run build        # produce a production bundle in app/dist/
npm run preview      # serve app/dist/ locally
```

### Option B — Docker (production-shaped, what the team will demo)

Run from the `Editor/` folder (the one that contains `docker-compose.yaml`):

```bash
cd SMC/frontend/Editor
docker compose up --build      # builds the image, starts nginx on :8080
# open http://localhost:8080
```

Other handy commands:

```bash
docker compose up -d --build           # detached
docker compose logs -f editor          # tail logs
curl -sI http://localhost:8080         # 200 OK, Server: nginx
curl -s  http://localhost:8080/healthz # "ok"
docker compose down                    # stop + remove the container
docker images code-test-editor:dev     # built image (~50 MB)
```

What `docker compose up --build` does, end to end:

1. Reads `docker-compose.yaml` → service `editor`, build context `./app`.
2. Stage `depends`: install dependencies once (`npm ci`).
3. Stage `source`: copy the app source on top of the dependency layer.
4. Stage `build`: `npm run build` → `/app/dist` (lint/test targets are available for CI and are no-ops if scripts are missing).
5. Stage `runtime`: copies `dist/` into `nginx:1.30-alpine-slim` and copies `app/nginx.conf` to `/etc/nginx/conf.d/default.conf`.
4. Tags the image `code-test-editor:dev` and runs it with port `8080:80`.

If you change source files and want a fresh image, re-run with `--build`. The `.dockerignore` keeps `node_modules`, `dist`, `.git`, etc. out of the build context so rebuilds stay fast.

### Reproduce CI locally (lint / test / build stages)

CI calls the Dockerfile stages by name; you can run the same commands to debug a CI failure:

```bash
cd SMC/frontend/Editor/app
docker buildx build --target lint .
docker buildx build --target test .
docker buildx build --target runtime -t code-test-editor:dev .
```

### Check the runtime image for CVEs

The runtime stage runs `apk upgrade` on every CI build, with the `APK_CACHE_BUST` build-arg set per run so the upgrade layer never reuses stale cache. To verify locally and re-run a Docker Scout / Trivy scan:

```bash
cd SMC/frontend/Editor/app
docker buildx build --pull --no-cache-filter=runtime \
  --build-arg APK_CACHE_BUST="$(date +%s)" \
  --target runtime -t code-test-editor:dev --load .

docker scout cves code-test-editor:dev      # or: trivy image code-test-editor:dev
```

## File map
```
SMC/frontend/
├── README.md              # this file (handover)
├── docker-compose.yaml    # one service: `editor`, builds ./app, exposes :8080
├── Dockerfile             # multi-stage: depends → source → lint/test/build → runtime
├── nginx.conf             # SPA fallback, /assets cache, /healthz
├── .dockerignore          # excludes node_modules / dist / .git
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── api/               # Global API clients (Axios instance)
    ├── components/        # Common UI atoms (Buttons, Modals)
    ├── features/          # Functional modules (The heart of SMC)
    │   ├── auth/          # Login/Register logic
    │   ├── problems/      # Problem list & rendering
    │   └── workspace/     # Monaco editor, Toolbar, Console output
    ├── hooks/             # Shared hooks (useWebSocket, useDebounce)
    ├── pages/             # Route-level components (Home, Workspace)
    ├── store/             # Global state (Zustand)
    ├── styles/            # Global CSS & Tailwind directives
    ├── types/             # TS interfaces (Mapped to Go structs)
    ├── main.tsx           # React root, <StrictMode>
    └── App.tsx            # Root component with React Router

```

## Architecture

The system has moved from a monolithic component to a modular, decoupled architecture:

* **Component Decoupling**: The UI is split into **Dumb Components** (UI-only in `src/components`) and **Smart Components** (logic-heavy in `src/features`).
* **State Management**: Uses **Zustand** for lightweight and robust state management instead of complex Prop drilling.
* **Uncontrolled Editor**: The editor uses `defaultValue` and a `path` prop to allow Monaco to manage its own models natively.
* **Backend Ready**: Interfaces in `src/types/` are designed to match the **Go backend** structs to ensure type safety across the stack.


### Build pipeline (multi-stage Dockerfile)

The Dockerfile splits cleanly into a **build-time** image and a **runtime** image. The build image has Node, npm, and the full source tree; the runtime image has only nginx and the compiled static bundle.

```
  node:20-alpine  →  depends → source → lint / test / build   (BUILD-TIME ONLY)
                                                ↓
                                            /app/dist  (just static HTML/JS/CSS)
                                                ↓
  nginx:1.30-alpine-slim  →  runtime   ← COPY --from=build /app/dist
```

Why this matters:

- **Only `/app/dist` crosses into the runtime image.** No `node`, no `npm`, no `node_modules`, no build-time Alpine packages. The published image is ~8 MB and contains 32 packages.
- **CVEs flagged on `node:20-alpine` by IDE linters do not ship.** That stage is thrown away after `npm run build` finishes. Docker Scout scans the final image and reports 0 Critical / 0 High.
- **Lint and test are separate stages off `source`.** CI calls them by name (`docker buildx build --target lint`), so the toolchain lives in one place and the workflow YAML stays thin.

### Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Build tool | Vite 5 | Fast HMR, no SSR (Monaco hates SSR) |
| Framework | React 18 | Wider compatibility with `@monaco-editor/react` than 19 today |
| Language | TypeScript 5 (strict) | `noUnusedLocals`, `noUnusedParameters` on |
| Editor | `@monaco-editor/react` 4.x | Wraps `monaco-editor`; handles loader/AMD config |
| Styling | Inline + one tiny `index.css` | No CSS framework needed for one screen |
| State | Two `useState` calls | No Redux / Zustand for a POC |
| Persistence | None | No localStorage, no backend, no DB |
| Runtime image | `nginx:1.30-alpine-slim` | Static SPA serving; no Node at runtime |

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

### Tier C — useful but probably belongs to the full stack, not v0

10. Multi-tab / multi-file editor.
11. Vim / Emacs keybindings via `monaco-vim` or `monaco-emacs`.
12. Custom theme matching the eventual product brand.
13. Live collaboration (Yjs + monaco-yjs) — high wow-factor but irrelevant for a solo test-taker.
14. Linting / type-checking for non-built-in languages. Monaco only ships TS/JS/CSS/HTML/JSON language services; Python or Go diagnostics need a Language Server (LSP), which by definition needs a backend.

## Out of scope

- **Authentication / login.** v0 has no resource to protect.
- **Database or persistence beyond `localStorage`.** Moves us out of "browser-only POC".
- **Real code grading.** Domain rule says candidates never see scores; client-side grading would tempt us to surface them. It also belongs to a sandboxed worker, not the editor.
- **Multi-user concurrency / sessions.** No session concept exists at v0.

## Conventions to keep

- **Keep the POC tiny.** If a change adds a new component file, ask whether it belongs in v0 or in the full stack before writing it. The whole point is that v0 stays small enough to demo in 60 seconds.
- **Uncontrolled editor.** Use `defaultValue` + `editorRef.current.getValue()` when read is needed. Do not switch to a controlled `value` prop without a reason — it forces re-renders on every keystroke and breaks Monaco's native undo.
- **Language IDs are lowercase Monaco IDs** (`javascript`, `python`, `go`, `c`, `cpp`). The `Language` union, `SKELETONS` keys, and `<option value>` strings must all match.
- **No secrets, no API keys** in this folder. The POC has no backend.
- **No `console.log`** in committed code.
- **TypeScript strict.** `npx tsc --noEmit` should pass clean before any edit is considered done.
- **Mobile is not supported.** Don't add mobile-specific styling that suggests otherwise.
- **Docker target stays static-built + nginx.** Do not switch the runtime image to `node` or run `vite dev` inside the container — that's not how the MVP will deploy.
