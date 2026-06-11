# Per-Problem Time Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to set a per-problem execution time limit (in milliseconds) when creating or editing a problem, replacing the current global 5-second constant used by the judge.

**Architecture:** Add `TimeLimitMs int` to `domain.Problem` and thread it through the full stack — repo (persist/read from the existing `time_limit_ms` DB column), handler (decode/encode from JSON), and judge runners (replace `ExecutionTimeout` constant with a per-problem duration at execution time). Compile steps keep the global constant. Frontend gains a number input in the create/edit form.

**Tech Stack:** Go (domain, repository, handler, judge), React + TypeScript (frontend form), sqlmock (backend tests), existing PostgreSQL schema (column already exists).

**Branch:** `feat/per-problem-time-limit`

---

## Section 1: Data Model + DB Persistence

### Files
- Modify: `backend/internal/domain/problem.go`
- Modify: `backend/internal/repository/problem_repo.go`

### `domain.Problem` change

Add one field:
```go
type Problem struct {
    ID          int        `json:"id"`
    Title       string     `json:"title"`
    Difficulty  string     `json:"difficulty"`
    Description string     `json:"description"`
    TestCases   []TestCase `json:"testCases"`
    TimeLimitMs int        `json:"timeLimitMs"`
}
```

Zero value (`0`) means "not set" — the repository defaults it to `5000`. This keeps all existing callers (tests, seed data) working without changes.

### Repository changes

**`Create`**: replace hardcoded `TimeLimitMs: 5000` with:
```go
timeLimitMs := prob.TimeLimitMs
if timeLimitMs <= 0 {
    timeLimitMs = 5000
}
_, err = qtx.CreateProblem(ctx, sqlcdb.CreateProblemParams{
    ...
    TimeLimitMs:   int32(timeLimitMs),
    MemoryLimitKb: 262144,
})
```

**`Update`**: extend the UPDATE SQL to include `time_limit_ms`:
```go
timeLimitMs := prob.TimeLimitMs
if timeLimitMs <= 0 {
    timeLimitMs = 5000
}
res, err := tx.ExecContext(ctx,
    `UPDATE problems SET title = $1, difficulty = $2, description = $3, time_limit_ms = $4 WHERE id = $5`,
    prob.Title, prob.Difficulty, prob.Description, timeLimitMs, id,
)
```

**`GetByID`**: extend SELECT and scan:
```go
err := r.db.QueryRow(
    `SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id = $1`, id,
).Scan(&p.ID, &p.Title, &diff, &p.Description, &p.TimeLimitMs)
```

**`List`**: extend SELECT and scan:
```go
rows, err := r.db.Query(
    `SELECT id, title, difficulty, description, time_limit_ms FROM problems ORDER BY id ASC`,
)
// scan: &p.ID, &p.Title, &diff, &p.Description, &p.TimeLimitMs
```

**`ListAssigned`**: same SELECT/scan extension as `List`.

---

## Section 2: Handler

### Files
- Modify: `backend/internal/handler/problem.go`

**`Create`**: no code change — `domain.Problem` is decoded directly from the JSON body, so `timeLimitMs` binds automatically.

**`Update`** inline request struct: add the field and wire it to `prob`:
```go
var req struct {
    Title       string `json:"title"`
    Difficulty  string `json:"difficulty"`
    Description string `json:"description"`
    TimeLimitMs int    `json:"timeLimitMs"`
    TestCases   []struct {
        Input          string `json:"input"`
        ExpectedOutput string `json:"expected_output"`
        IsHidden       bool   `json:"isHidden"`
    } `json:"testCases"`
}
// ...
prob := domain.Problem{
    Title: req.Title, Difficulty: req.Difficulty,
    Description: req.Description, TimeLimitMs: req.TimeLimitMs,
}
```

**`GetByIDAdmin`** response struct: add `TimeLimitMs` so the edit form can load the current value:
```go
type adminProb struct {
    ID          int       `json:"id"`
    Title       string    `json:"title"`
    Difficulty  string    `json:"difficulty"`
    Description string    `json:"description"`
    TimeLimitMs int       `json:"timeLimitMs"`
    TestCases   []adminTC `json:"testCases"`
}
```

---

## Section 3: Judge Layer

### Files
- Modify: `backend/internal/judge/judge.go`
- Modify: `backend/internal/judge/process_runner.go`
- Modify: `backend/internal/judge/docker_runner.go`

**`judge.go`**: add helper (no interface changes):
```go
func executionTimeout(ms int) time.Duration {
    if ms <= 0 {
        return ExecutionTimeout
    }
    return time.Duration(ms) * time.Millisecond
}
```

**`process_runner.go`** — `Run` computes timeout and passes it down:
```go
func (r *ProcessRunner) Run(ctx context.Context, prob domain.Problem, code, language string) Result {
    // ...
    timeout := executionTimeout(prob.TimeLimitMs)
    // pass timeout to runTestCase
}
```
`runTestCase` signature gains `timeout time.Duration` and uses it:
```go
func (r *ProcessRunner) runTestCase(ctx context.Context, cfg langConfig, execBin string, execArgs []string,
    tc domain.TestCase, timeout time.Duration, idx, passed, total int) (Result, bool) {
    execCtx, cancel := context.WithTimeout(ctx, timeout)
    // ...
}
```
`compileBinary` and `compileCheck` keep `ExecutionTimeout`.

**`docker_runner.go`** — same pattern:
```go
func (r *DockerRunner) Run(ctx context.Context, prob domain.Problem, code, language string) Result {
    timeout := executionTimeout(prob.TimeLimitMs)
    // pass to runTestCase
}
```
`runTestCase` gains `timeout time.Duration`:
```go
func (r *DockerRunner) runTestCase(ctx context.Context, cfg dockerLangConfig, code string,
    tc domain.TestCase, timeout time.Duration, idx, passed, total int) (Result, bool) {
    execCtx, cancel := context.WithTimeout(ctx, timeout)
    // ...
}
```
`compileCheck` keeps `ExecutionTimeout`.

---

## Section 4: Frontend

### Files
- Modify: `frontend/src/types/problem.ts`
- Modify: `frontend/src/features/problems/api.ts`
- Modify: `frontend/src/pages/interviewer/index.tsx`

**`types/problem.ts`**:
```ts
export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  testCases?: TestCase[];
  timeLimitMs?: number;
}
```

**`features/problems/api.ts`** — `UpdateProblemPayload`:
```ts
interface UpdateProblemPayload {
  title: string;
  difficulty: string;
  description: string;
  timeLimitMs?: number;
  testCases: { input: string; expected_output: string; isHidden?: boolean }[];
}
```

**`pages/interviewer/index.tsx`**:
- Add state: `const [timeLimitMs, setTimeLimitMs] = useState<number>(5000);`
- Pass `timeLimitMs` / `setTimeLimitMs` through `ProblemFormFieldsProps` and render a number input labeled "Time Limit (ms)"
- Include in `handleSubmitProblem`: `timeLimitMs` added to `problemData`
- When opening edit modal: populate `timeLimitMs` from `fetchAdminProblemById` response (`data.timeLimitMs ?? 5000`)
- Include in update payload passed to `updateProblem`

---

## Section 5: Tests

### Files
- Modify: `backend/internal/repository/problem_repo_test.go`
- Modify: `backend/internal/handler/problem_test.go`
- Modify: `backend/internal/judge/runner_test.go`

### Repository tests (sqlmock)

**`TestProblemRepo_Create_CustomTimeLimitMs`**: expect `CreateProblem` INSERT with `time_limit_ms = 3000`; verify `prob.TimeLimitMs` passes through.

**`TestProblemRepo_Create_DefaultTimeLimitMs`**: call `Create` with `prob.TimeLimitMs = 0`; expect INSERT with `time_limit_ms = 5000`.

**`TestProblemRepo_GetByID_ReturnsTimeLimitMs`**: mock row includes `time_limit_ms = 7000`; verify returned `domain.Problem.TimeLimitMs == 7000`.

### Handler tests

**`TestProblemHandler_Create_WithTimeLimitMs`**: POST body `{"title":"T","timeLimitMs":3000,...}`; assert service `Create` is called with `prob.TimeLimitMs == 3000`.

**`TestProblemHandler_Update_WithTimeLimitMs`**: PUT body `{"title":"T","timeLimitMs":2000,...}`; assert service `Update` is called with `prob.TimeLimitMs == 2000`.

### Judge runner test

**`TestProcessRunner_RespectsTimeLimitMs`**: create a `domain.Problem` with `TimeLimitMs=100` and a test case whose expected input triggers an infinite loop (e.g., Python `while True: pass`); run via `ProcessRunner`; assert result `Status == domain.StatusTimeLimitExceeded`.
