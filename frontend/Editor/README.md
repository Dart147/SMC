# SMC Editor

## What this is

A standalone localhost POC of the in-browser code editor for **SMC**'s Online Code Test system. It is a single-page Vite + React + TypeScript app that mounts a Monaco editor with a language switcher and a theme toggle — deliberately the smallest demo-able artifact: one screen, one editor, no backend.

## Current status

**Done**

- Vite + React 18 + TypeScript (strict) scaffold under `app/`.
- `@monaco-editor/react` mounted full-viewport with header chrome.
- Language switching across **JavaScript, Python, Go, C, C++** (Monaco language IDs lowercase: `javascript`, `python`, `go`, `c`, `cpp`).
- Dark / light theme toggle.
- Per-language skeleton seeded into a Monaco model keyed by `path={solution.<lang>}` so switching languages swaps buffers cleanly and each language keeps its own undo stack.
- **Docker path is wired:** multi-stage `Dockerfile` (`node:20-alpine` build → `nginx:1.27-alpine` serve) at `app/Dockerfile`, `app/nginx.conf` (SPA fallback + long immutable cache for `/assets/` + `/healthz`), `app/.dockerignore`, and `docker-compose.yaml` at the `Editor/` root exposing the editor on `http://localhost:8080`.

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
2. Stage 1 of `app/Dockerfile`: `node:20-alpine`, `npm ci`, `npm run build` → `/app/dist`.
3. Stage 2: copies `dist/` into `nginx:1.27-alpine` and copies `app/nginx.conf` to `/etc/nginx/conf.d/default.conf`.
4. Tags the image `code-test-editor:dev` and runs it with port `8080:80`.

If you change source files and want a fresh image, re-run with `--build`. The `.dockerignore` keeps `node_modules`, `dist`, `.git`, etc. out of the build context so rebuilds stay fast.

## File map

```
SMC/frontend/Editor/
├── README.md              # this file (handover)
├── docker-compose.yaml    # one service: `editor`, builds ./app, exposes :8080
└── app/
    ├── Dockerfile         # multi-stage: node:20-alpine build → nginx:1.27-alpine serve
    ├── nginx.conf         # SPA fallback, /assets cache, /healthz
    ├── .dockerignore      # keeps node_modules / dist / .git out of the build context
    ├── package.json
    ├── package-lock.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── src/
        ├── main.tsx       # React root, <StrictMode>
        ├── index.css      # page chrome around the editor
        ├── App.tsx        # the entire demo (header + editor)
        └── vite-env.d.ts
```

## Architecture

All logic in one component:

- `main.tsx` mounts `<App />` into `#root` inside `<StrictMode>`.
- `App.tsx` owns two pieces of state:
  - `language: 'javascript' | 'python' | 'go' | 'c' | 'cpp'`
  - `theme: 'vs-dark' | 'vs-light'`
- `SKELETONS` is a `Record<Language, string>` literal, in-memory only.
- `<Editor>` is **uncontrolled** (`defaultValue`, no `value` prop). The `path={solution.${language}}` prop tells Monaco to manage one model per language; switching languages swaps models without a remount, so each language keeps its own buffer + undo stack while the user explores.

In the Docker path, that same SPA is built statically and served by nginx — no Node process at runtime. The `docker-compose.yaml` in this folder is the **same file** that will eventually contain `api`, `postgres`, `nats`, `minio`, and `traefik` per the repo-level. Folding the editor into the full stack later means *adding services*, not rewriting infra.

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
| Runtime image | `nginx:1.27-alpine` | Static SPA serving; no Node at runtime |

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
