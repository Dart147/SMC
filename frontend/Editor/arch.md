# IDE POC v0 — Architecture & Next Steps

This document captures (1) the architecture of the editor POC as it stands right now, (2) the immediate next step to make it Docker-deployable, and (3) the list of features I suggest adding **before** we expand into the full §3 POC described in `../IDE.md`.

## 1. Current architecture (v0, as of this commit)

A single-page Vite + React + TypeScript app, all logic in one component, runs in the candidate's browser.

```
                         browser (desktop only)
                ┌────────────────────────────────────────┐
                │  IDE/app  (Vite dev server :5173)      │
                │                                        │
                │   ┌────────────── App.tsx ──────────┐  │
                │   │                                 │  │
                │   │  <header>                       │  │
                │   │   • title                       │  │
                │   │   • <select> Language           │  │
                │   │     (js / py / go / c / cpp)    │  │
                │   │   • Theme toggle (dark / light) │  │
                │   │  </header>                      │  │
                │   │                                 │  │
                │   │  <Editor                        │  │
                │   │     language={language}         │  │
                │   │     path="solution.<lang>"      │  │
                │   │     defaultValue={SKELETONS[…]} │  │
                │   │  />  ← @monaco-editor/react     │  │
                │   │                                 │  │
                │   └─────────────────────────────────┘  │
                │           ▲                            │
                │           │ loads ~3 MB of Monaco      │
                │           │ assets + Web Workers       │
                │           ▼                            │
                │   monaco-editor/esm/* (CDN-free)       │
                └────────────────────────────────────────┘
```

### Component / data flow

- `main.tsx` mounts `<App />` into `#root`. `<StrictMode>` is on.
- `App.tsx` owns two pieces of state:
  - `language: 'javascript' | 'python' | 'go' | 'c' | 'cpp'`
  - `theme: 'vs-dark' | 'vs-light'`
- `SKELETONS` is a `Record<Language, string>` literal, in-memory only.
- `<Editor>` is **uncontrolled** (`defaultValue`, no `value` prop). The `path={solution.${language}}` prop tells Monaco to manage one model per language; switching languages swaps models without a remount, so each language keeps its own buffer + undo stack while the user explores.

### Tech inventory

| Layer | Choice | Notes |
|---|---|---|
| Build tool | Vite 5 | Fast HMR, no SSR (Monaco hates SSR) |
| Framework | React 18 | Wider compatibility with `@monaco-editor/react` than 19 today |
| Language | TypeScript 5 (strict) | `noUnusedLocals`, `noUnusedParameters` on |
| Editor | `@monaco-editor/react` 4.x | Wraps `monaco-editor`; handles loader/AMD config for us |
| Styling | Inline + one tiny `index.css` | No CSS framework needed for one screen |
| State | Two `useState` calls | No Redux / Zustand for a POC |
| Persistence | None | No localStorage, no backend, no DB |

### What's deliberately absent

- No Submit button, no problem panel, no timer, no auth, no read-only header region inside the editor, no draft autosave.
- No tests. v0 is small enough that the demo script *is* the test; tests get added at §3.
- No service worker, no PWA, no offline mode.

## 2. Next step — finish the Docker path

The course rubric rewards **"easy to deploy"**, and right now the POC only runs via `npm run dev`. The immediate next step is to make `docker compose up --build` from `IDE/` produce a working editor on `http://localhost:8080`.

### Plan

1. **Move the Dockerfile** from `IDE/Dockerfile` into `IDE/app/Dockerfile`. The Dockerfile sits with the app it builds, and its `COPY package.json` line then resolves correctly without path acrobatics.
2. **Add `IDE/app/nginx.conf`** with:
   - SPA fallback (`try_files $uri $uri/ /index.html`).
   - Long immutable cache for `/assets/` (Vite's hashed bundles, including the ~3 MB Monaco workers).
3. **Add `IDE/app/.dockerignore`** containing `node_modules`, `dist`, `.git`, `.vscode`, `*.log` so the build context stays small.
4. **Add `IDE/docker-compose.yml`** with one service:
   ```yaml
   services:
     editor:
       build: ./app
       image: code-test-editor:dev
       ports:
         - "8080:80"
       restart: unless-stopped
   ```
5. **Verify**:
   - `docker compose up --build` starts cleanly; nginx logs `start worker processes`.
   - `curl -sI http://localhost:8080` → `200 OK`, `Server: nginx`.
   - `docker images code-test-editor:dev` → image under ~50 MB.
   - `docker compose down` cleans up with no residue.

This is a one-sitting task; after it lands, the editor POC is fully containerized and the team can run it without Node on their laptops.

### After Docker, the natural next step

`IDE/docker-compose.yml` is the **same file** that will eventually contain `api`, `postgres`, `nats`, `minio`, and `traefik` per `../IDE.md` §3 and `../architecture.md`. Starting the compose file now means the §3 expansion is *adding services*, not rewriting infra. That's the explicit reason to invest in the compose layer at v0.

## 3. Suggested features to add to the editor POC (still backend-free)

These are features that fit inside v0's "just an editor in a browser tab" frame — no API, no auth, no problem store — but make the demo more convincing and de-risk decisions we'd otherwise hit later. Listed in the order I'd build them.

### Tier A — small wins, do these next after Docker is wired

1. **Keyboard shortcut for "Submit" (no-op for now).**
   `editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, …)` so we wire the muscle memory now and the no-op gets replaced with a real `fetch` later. Value: validates the `onMount` plumbing we'll need anyway.

2. **Disable the right-click context menu** (`contextmenu: false`).
   Removes the Command Palette → Open File side-channel. One-line change, real anti-cheat improvement, and aligns with `../IDE.md` §8.

3. **Mobile / small-viewport notice.**
   Render a "please use a desktop browser" panel below ~768 px instead of a broken Monaco. Monaco officially does not support mobile; surfacing this prevents demo-day "it doesn't work on my phone" feedback.

4. **Font size +/− buttons in the header.**
   Trivial useState; demos well. Candidates routinely ask for this.

5. **Reset-to-skeleton button.**
   "Reset code" button that calls `editorRef.current.setValue(SKELETONS[language])`. Useful both for the demo loop and for the candidate flow.

### Tier B — slightly more, but still no backend

6. **Draft autosave to `localStorage`** keyed by `language`.
   Survives accidental refreshes. Shape the storage key as `draft/<language>` so we don't collide with future `submissions/<id>` entries. Restoring on mount is one `useEffect`.

7. **Read-only "header" region inside the editor.**
   Lock the function signature so the candidate can't change the entry point the grader will call. Implementation: `monaco.editor.IModelDeltaDecoration` + an `onDidChangeModelContent` guard that reverts edits whose range intersects lines 1..N of the skeleton. This is the single feature that will most influence the §3 grader contract; worth de-risking now.

8. **Run-button stub with disabled tooltip.**
   A visible Run button that's `disabled` with tooltip "Grading runs server-side; results are reviewed by your interviewer." Trains the candidate flow correctly even before the grader exists, and surfaces the domain rule that candidates never see scores.

9. **In-browser JS execution** (only for the `javascript` language) using a sandboxed `iframe srcdoc` or a Web Worker.
   Strictly a demo aid, *not* the grader. Lets us show "code → output" round-trips on day one without a backend, while making it obvious that real grading needs a server-side sandbox (Python, Go, C, C++ all stay disabled). This is the highest-leverage feature for stakeholder demos and the riskiest for misleading the team — only build it if we explicitly label it "demo only, not a grader."

### Tier C — useful but probably belongs to §3, not v0

10. Multi-tab / multi-file editor (Monaco supports it natively but we don't need it yet).
11. Vim / Emacs keybindings via `monaco-vim` or `monaco-emacs`.
12. Custom theme matching the eventual product brand.
13. Live collaboration (Yjs + monaco-yjs). High wow-factor, but irrelevant to the test-taker use case where each candidate is solo.
14. Linting / type-checking for non-built-in languages. Monaco only ships TS/JS/CSS/HTML/JSON language services; getting Python or Go diagnostics requires a Language Server, which by definition needs a backend (LSP server) — so this naturally belongs to §3.

### What I would NOT add to v0

- **Authentication / login.** v0 has no resource to protect.
- **Database or persistence beyond `localStorage`.** Moves us out of "browser-only POC."
- **Real code grading.** Domain rule says candidates never see scores; building it client-side would tempt us to surface scores. It also belongs to a sandboxed worker, not the editor.
- **Multi-user concurrency / sessions.** No session concept exists at v0.

## 4. How this evolves into the §3 POC

The progression from v0 to §3 (per `../IDE.md`) is explicitly *additive*:

| Concern | v0 (now) | §3 (next) |
|---|---|---|
| Editor | Monaco in `App.tsx` | Same Monaco component, lifted into `<MonacoEditor>` |
| Surrounding UI | header + editor | + ProblemPanel + Toolbar + StatusBar |
| Routing | none (single page) | Next.js App Router at `/exam/[problemId]` |
| Submit | none | API contract: `POST /sessions/:id/submit` |
| Backend | none | api + postgres + nats + minio + grader workers |
| Edge | nginx in container | + Traefik, + TLS via DNS-01 |
| Deploy | `docker compose up` (one service) | `docker compose up` (full stack) |

The bet of v0 is that this column-by-column expansion costs us less than starting over. So far the bet looks good: the Monaco component, language list, theme toggle, and Docker single-service stay byte-for-byte identical between v0 and §3.
