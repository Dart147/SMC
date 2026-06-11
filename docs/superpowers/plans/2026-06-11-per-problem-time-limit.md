# Per-Problem Time Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to set a per-problem execution time limit (ms) when creating or editing a problem, replacing the global 5-second constant in the judge.

**Architecture:** Add `TimeLimitMs int` to `domain.Problem`, thread it through repo (existing `time_limit_ms` DB column), handler (JSON decode/encode), and both judge runners (replace `ExecutionTimeout` constant per test-case execution only; compile steps keep the constant). Frontend gains a number input in create and edit forms.

**Tech Stack:** Go (domain, sqlmock repository tests, handler tests, judge unit tests), React + TypeScript (form state + API payload).

**Branch:** `feat/per-problem-time-limit` (branch off `main` before starting)

---

## File Map

| File | Change |
|---|---|
| `backend/internal/domain/problem.go` | Add `TimeLimitMs int` field |
| `backend/internal/repository/problem_repo.go` | Create/Update persist it; GetByID/List/ListAssigned read it |
| `backend/internal/repository/problem_repo_test.go` | Update broken mocks + add 3 new tests |
| `backend/internal/handler/problem.go` | Update inline req struct + GetByIDAdmin response |
| `backend/internal/handler/problem_test.go` | Add 2 new tests |
| `backend/internal/judge/judge.go` | Add `executionTimeout` helper |
| `backend/internal/judge/process_runner.go` | Pass timeout to `runTestCase` |
| `backend/internal/judge/docker_runner.go` | Pass timeout to `runTestCase` |
| `backend/internal/judge/runner_test.go` | Add 1 new TLE test |
| `frontend/src/types/problem.ts` | Add `timeLimitMs?: number` |
| `frontend/src/features/problems/api.ts` | Add `timeLimitMs?: number` to `UpdateProblemPayload` |
| `frontend/src/pages/interviewer/index.tsx` | Add state + input + include in payloads |

---

## Task 1: Set up branch and add `TimeLimitMs` to domain model

**Files:**
- Modify: `backend/internal/domain/problem.go`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/per-problem-time-limit
```

- [ ] **Step 2: Add `TimeLimitMs` to `domain.Problem`**

Replace the entire `backend/internal/domain/problem.go` with:

```go
package domain

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	IsHidden       bool   `json:"-"`
}

type Problem struct {
	ID          int        `json:"id"`
	Title       string     `json:"title"`
	Difficulty  string     `json:"difficulty"`
	Description string     `json:"description"`
	TestCases   []TestCase `json:"testCases"`
	TimeLimitMs int        `json:"timeLimitMs"`
}

func (p Problem) ForDisplay() Problem {
	out := p
	out.TestCases = nil
	for _, tc := range p.TestCases {
		if !tc.IsHidden {
			out.TestCases = append(out.TestCases, tc)
		}
	}
	return out
}

func (p Problem) FirstSample() (TestCase, bool) {
	for _, tc := range p.TestCases {
		if !tc.IsHidden {
			return tc, true
		}
	}
	return TestCase{}, false
}
```

- [ ] **Step 3: Verify existing tests still compile and pass**

```bash
cd backend && go test ./internal/domain/... ./internal/service/... ./internal/handler/... -count=1
```

Expected: All pass (zero value `TimeLimitMs=0` doesn't break anything).

- [ ] **Step 4: Commit**

```bash
git add backend/internal/domain/problem.go
git commit -m "feat: add TimeLimitMs field to domain.Problem"
```

---

## Task 2: Repository — update tests and implementation

**Files:**
- Modify: `backend/internal/repository/problem_repo.go`
- Modify: `backend/internal/repository/problem_repo_test.go`

### Step 2a: Update broken existing tests

The `List` and `GetByID` queries gain a `time_limit_ms` column; existing mock patterns no longer match. Fix them first so you can run tests in a red→green cycle.

- [ ] **Step 1: Update `problemCols` helper and broken mock patterns in `problem_repo_test.go`**

Find and replace these in `backend/internal/repository/problem_repo_test.go`:

**Replace** the top of the file (lines 1–14):
```go
package repository

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Dart147/SMC/backend/internal/domain"
)

var problemCols = []string{"id", "title", "difficulty", "description", "time_limit_ms"}

func newProblemRow(id, title, diff, desc string) *sqlmock.Rows {
	return sqlmock.NewRows(problemCols).AddRow(id, title, diff, desc, 5000)
}
```

**Replace** the `List_Success` query expectation (was `SELECT id, title, difficulty, description FROM problems`):
```go
mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems`).
    WillReturnRows(newProblemRow("100001", "Two Sum", "Easy", "desc").
        AddRow("100002", "LRU Cache", "Medium", "desc2", 5000))
```

**Replace** the `List_QueryError` query expectation:
```go
mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems`).
    WillReturnError(errDuplicate)
```

**Replace** both `GetByID` query expectations (was `SELECT id, title, difficulty, description FROM problems WHERE id`):
```go
mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id`).
```

**Replace** `ListAssigned_Success` inline rows (was 4-column `[]string{"id","title","difficulty","description"}`):
```go
mock.ExpectQuery(`SELECT p.id, p.title`).
    WithArgs("u1").
    WillReturnRows(sqlmock.NewRows([]string{"id", "title", "difficulty", "description", "time_limit_ms"}).
        AddRow("100001", "Two Sum", "Easy", "desc", 5000))
```

**Replace** `ListAssigned_Empty` inline columns:
```go
mock.ExpectQuery(`SELECT p.id, p.title`).
    WithArgs("u2").
    WillReturnRows(sqlmock.NewRows([]string{"id", "title", "difficulty", "description", "time_limit_ms"}))
```

- [ ] **Step 2: Run repo tests — expect failures on unimplemented code**

```bash
cd backend && go test ./internal/repository/... -run TestProblemRepo -count=1 -v 2>&1 | head -40
```

Expected: compile error or scan mismatch — confirms tests are ahead of implementation.

### Step 2b: Add new tests

- [ ] **Step 3: Append 3 new tests to `problem_repo_test.go`**

Add at the end of the file:

```go
// --- TimeLimitMs ---

func TestProblemRepo_Create_CustomTimeLimitMs(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO problems`).
		WithArgs(
			sqlmock.AnyArg(),   // id (random)
			"Slow Problem",
			sqlmock.AnyArg(),   // difficulty NullString
			"desc",
			int32(3000),        // TimeLimitMs
			int32(262144),      // MemoryLimitKb
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("111111"))
	mock.ExpectCommit()

	repo := NewProblemRepo(db)
	p := &domain.Problem{Title: "Slow Problem", Description: "desc", TimeLimitMs: 3000}
	if err := repo.Create(p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}

func TestProblemRepo_Create_DefaultTimeLimitMs(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO problems`).
		WithArgs(
			sqlmock.AnyArg(),
			"Default TL",
			sqlmock.AnyArg(),
			"desc",
			int32(5000), // zero TimeLimitMs defaults to 5000
			int32(262144),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("222222"))
	mock.ExpectCommit()

	repo := NewProblemRepo(db)
	p := &domain.Problem{Title: "Default TL", Description: "desc", TimeLimitMs: 0}
	if err := repo.Create(p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}

func TestProblemRepo_GetByID_ReturnsTimeLimitMs(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id`).
		WithArgs("100001").
		WillReturnRows(
			sqlmock.NewRows(problemCols).AddRow("100001", "Hard Problem", "Hard", "desc", 7000),
		)
	mock.ExpectQuery(`SELECT input, expected_output`).
		WillReturnRows(sqlmock.NewRows([]string{"input", "expected_output", "is_hidden"}))

	repo := NewProblemRepo(db)
	p, ok := repo.GetByID("100001")
	if !ok {
		t.Fatal("expected found")
	}
	if p.TimeLimitMs != 7000 {
		t.Errorf("TimeLimitMs: got %d, want 7000", p.TimeLimitMs)
	}
}
```

### Step 2c: Implement repository changes

- [ ] **Step 4: Update `problem_repo.go` — `Create` method**

Replace the hardcoded `TimeLimitMs: 5000` block in `Create` (lines 44–52):

```go
timeLimitMs := prob.TimeLimitMs
if timeLimitMs <= 0 {
    timeLimitMs = 5000
}
_, err = qtx.CreateProblem(ctx, sqlcdb.CreateProblemParams{
    ID:            newProblemID,
    Title:         prob.Title,
    Difficulty:    sql.NullString{String: prob.Difficulty, Valid: prob.Difficulty != ""},
    Description:   prob.Description,
    TimeLimitMs:   int32(timeLimitMs),
    MemoryLimitKb: 262144,
})
```

- [ ] **Step 5: Update `problem_repo.go` — `GetByID` method**

Replace the query and Scan call (lines 106–117):

```go
func (r *ProblemRepo) GetByID(id string) (domain.Problem, bool) {
	var p domain.Problem
	var diff sql.NullString
	err := r.db.QueryRow(
		`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id = $1`, id,
	).Scan(&p.ID, &p.Title, &diff, &p.Description, &p.TimeLimitMs)
	if err != nil {
		return domain.Problem{}, false
	}
	p.Difficulty = diff.String
	p.TestCases = r.getTestCasesByProblemID(p.ID)
	return p, true
}
```

- [ ] **Step 6: Update `problem_repo.go` — `List` method**

Replace the query and scan inside `List` (lines 84–104):

```go
func (r *ProblemRepo) List() []domain.Problem {
	rows, err := r.db.Query(
		`SELECT id, title, difficulty, description, time_limit_ms FROM problems ORDER BY id ASC`,
	)
	if err != nil {
		return []domain.Problem{}
	}
	defer func() { _ = rows.Close() }()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		var diff sql.NullString
		if err := rows.Scan(&p.ID, &p.Title, &diff, &p.Description, &p.TimeLimitMs); err != nil {
			continue
		}
		p.Difficulty = diff.String
		p.TestCases = r.getTestCasesByProblemID(p.ID)
		problems = append(problems, p)
	}
	return problems
}
```

- [ ] **Step 7: Update `problem_repo.go` — `ListAssigned` method**

Replace the query and scan inside `ListAssigned` (lines 140–169):

```go
func (r *ProblemRepo) ListAssigned(userID string) []domain.Problem {
	query := `
		SELECT p.id, p.title, p.difficulty, p.description, p.time_limit_ms
		FROM problems p
		INNER JOIN user_problem_assignments upa ON p.id = upa.problem_id
		WHERE upa.user_id = $1
		ORDER BY p.id ASC`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return []domain.Problem{}
	}
	defer func() { _ = rows.Close() }()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		var diff sql.NullString
		var idStr string
		if err := rows.Scan(&idStr, &p.Title, &diff, &p.Description, &p.TimeLimitMs); err != nil {
			continue
		}
		p.ID, _ = strconv.Atoi(idStr)
		p.Difficulty = diff.String
		p.TestCases = r.getTestCasesByProblemID(p.ID)
		problems = append(problems, p)
	}
	if problems == nil {
		return []domain.Problem{}
	}
	return problems
}
```

- [ ] **Step 8: Update `problem_repo.go` — `Update` method**

Replace the `ExecContext` call in `Update` (lines 197–200):

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

- [ ] **Step 9: Run all repository tests — expect green**

```bash
cd backend && go test ./internal/repository/... -count=1 -v 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/internal/repository/problem_repo.go backend/internal/repository/problem_repo_test.go
git commit -m "feat: persist and read TimeLimitMs in problem repository"
```

---

## Task 3: Handler — wire `timeLimitMs` through Update and GetByIDAdmin

**Files:**
- Modify: `backend/internal/handler/problem.go`
- Modify: `backend/internal/handler/problem_test.go`

### Step 3a: Add new handler tests first

- [ ] **Step 1: Append 2 new tests to `problem_test.go`**

Add at the end of `backend/internal/handler/problem_test.go`. These tests capture the `domain.Problem` passed to the service so we can assert on `TimeLimitMs`:

```go
// --- TimeLimitMs wiring ---

type capturingProblemService struct {
	mockProblemService
	lastCreated *domain.Problem
	lastUpdated *domain.Problem
}

func (s *capturingProblemService) Create(prob *domain.Problem) error {
	s.lastCreated = prob
	return s.createErr
}

func (s *capturingProblemService) Update(id string, prob *domain.Problem) error {
	s.lastUpdated = prob
	return s.updateErr
}

func TestProblemHandler_Create_WithTimeLimitMs(t *testing.T) {
	svc := &capturingProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]interface{}{
		"title":       "Fast Problem",
		"difficulty":  "Easy",
		"description": "desc",
		"timeLimitMs": 3000,
		"testCases":   []interface{}{},
	})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/problems", bytes.NewReader(body))
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("Create: got %d, want 201", w.Code)
	}
	if svc.lastCreated == nil || svc.lastCreated.TimeLimitMs != 3000 {
		t.Errorf("Create: TimeLimitMs = %d, want 3000", svc.lastCreated.TimeLimitMs)
	}
}

func TestProblemHandler_Update_WithTimeLimitMs(t *testing.T) {
	svc := &capturingProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]interface{}{
		"title":       "Updated",
		"difficulty":  "Hard",
		"description": "new",
		"timeLimitMs": 2000,
		"testCases":   []interface{}{},
	})

	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/problems/{id}", h.Update)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPut, "/api/problems/1", bytes.NewReader(body))
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("Update: got %d, want 200", w.Code)
	}
	if svc.lastUpdated == nil || svc.lastUpdated.TimeLimitMs != 2000 {
		t.Errorf("Update: TimeLimitMs = %d, want 2000", svc.lastUpdated.TimeLimitMs)
	}
}
```

- [ ] **Step 2: Run new handler tests — expect failure**

```bash
cd backend && go test ./internal/handler/... -run "TimeLimitMs" -count=1 -v
```

Expected: `TestProblemHandler_Update_WithTimeLimitMs` fails because the `Update` handler ignores `timeLimitMs` in the request. `TestProblemHandler_Create_WithTimeLimitMs` may pass already (since `domain.Problem` now has the field and is decoded directly) — confirm it.

### Step 3b: Implement handler changes

- [ ] **Step 3: Update `Update` handler in `problem.go`**

Replace the `var req struct { ... }` block in `Update` (lines 85–113):

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
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    http.Error(w, err.Error(), http.StatusBadRequest)
    return
}
prob := domain.Problem{
    Title:       req.Title,
    Difficulty:  req.Difficulty,
    Description: req.Description,
    TimeLimitMs: req.TimeLimitMs,
}
for _, tc := range req.TestCases {
    prob.TestCases = append(prob.TestCases, domain.TestCase{
        Input: tc.Input, ExpectedOutput: tc.ExpectedOutput, IsHidden: tc.IsHidden,
    })
}
```

- [ ] **Step 4: Update `GetByIDAdmin` response struct in `problem.go`**

Replace the `type adminProb struct { ... }` block (lines 124–134):

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

Replace the `json.NewEncoder(w).Encode(adminProb{...})` call to include `TimeLimitMs`:

```go
_ = json.NewEncoder(w).Encode(adminProb{
    ID: p.ID, Title: p.Title, Difficulty: p.Difficulty,
    Description: p.Description, TimeLimitMs: p.TimeLimitMs, TestCases: tcs,
})
```

- [ ] **Step 5: Run all handler tests — expect green**

```bash
cd backend && go test ./internal/handler/... -count=1 -v 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handler/problem.go backend/internal/handler/problem_test.go
git commit -m "feat: wire timeLimitMs through problem handler Update and GetByIDAdmin"
```

---

## Task 4: Judge — per-problem execution timeout

**Files:**
- Modify: `backend/internal/judge/judge.go`
- Modify: `backend/internal/judge/process_runner.go`
- Modify: `backend/internal/judge/docker_runner.go`
- Modify: `backend/internal/judge/runner_test.go`

### Step 4a: Write failing test first

- [ ] **Step 1: Append TLE test to `runner_test.go`**

Add after the existing `ProcessRunner` tests (before the `DockerRunner` section):

```go
func TestProcessRunner_RespectsTimeLimitMs(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)

	slowProblem := domain.Problem{
		ID:          99,
		Title:       "slow",
		TimeLimitMs: 100, // 100 ms — the infinite loop will exceed this
		TestCases: []domain.TestCase{
			{Input: "", ExpectedOutput: "never"},
		},
	}
	infiniteLoop := "while True: pass\n"

	res := r.Run(context.Background(), slowProblem, infiniteLoop, "python")
	if res.Status != domain.StatusTimeLimitExceeded {
		t.Errorf("want TimeLimitExceeded, got %q (error: %s)", res.Status, res.Error)
	}
}
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd backend && go test ./internal/judge/... -run TestProcessRunner_RespectsTimeLimitMs -count=1 -v
```

Expected: FAIL — currently `runTestCase` uses the global `ExecutionTimeout` (5s), so the 100ms limit is not respected.

### Step 4b: Implement judge changes

- [ ] **Step 3: Add `executionTimeout` helper to `judge.go`**

Add after the `const` block in `backend/internal/judge/judge.go`:

```go
func executionTimeout(ms int) time.Duration {
	if ms <= 0 {
		return ExecutionTimeout
	}
	return time.Duration(ms) * time.Millisecond
}
```

Also add `"time"` to the imports if not already present.

The full `judge.go` should be:

```go
package judge

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

const (
	MaxConcurrent    = 4
	ExecutionTimeout = 5 * time.Second
	MemoryLimitBytes = 256 * 1024 * 1024
)

type Result struct {
	Status               string
	Output               string
	ExpectedOutput       string
	ExpectedOutputHidden bool
	Error                string
	PassedTestCases      int
	TotalTestCases       int
	ExecutionTimeMs      int
}

type Judge struct {
	sem    chan struct{}
	runner Runner
	logger *zap.Logger
}

func NewJudge(runner Runner, logger *zap.Logger) *Judge {
	return &Judge{
		sem:    make(chan struct{}, MaxConcurrent),
		runner: runner,
		logger: logger,
	}
}

func (j *Judge) Run(ctx context.Context, prob domain.Problem, code, language string) Result {
	j.sem <- struct{}{}
	defer func() { <-j.sem }()
	return j.runner.Run(ctx, prob, code, language)
}

func executionTimeout(ms int) time.Duration {
	if ms <= 0 {
		return ExecutionTimeout
	}
	return time.Duration(ms) * time.Millisecond
}
```

- [ ] **Step 4: Update `process_runner.go` — compute timeout in `Run` and pass to `runTestCase`**

In `Run`, before the test-case loop, compute the timeout:

```go
timeout := executionTimeout(prob.TimeLimitMs)
```

Then change every call to `r.runTestCase(...)` to include `timeout` as a new parameter after `tc`:

```go
result, ok := r.runTestCase(ctx, cfg, execBin, execArgs, tc, timeout, i, passed, total)
```

Update the `runTestCase` signature to accept `timeout time.Duration`:

```go
func (r *ProcessRunner) runTestCase(ctx context.Context, cfg langConfig, execBin string, execArgs []string,
	tc domain.TestCase, timeout time.Duration, idx, passed, total int) (Result, bool) {
	execCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	// rest of the function unchanged
```

`compileBinary` and `compileCheck` are unchanged — they keep `ExecutionTimeout`.

- [ ] **Step 5: Update `docker_runner.go` — same pattern**

In `Run`, before the test-case loop:

```go
timeout := executionTimeout(prob.TimeLimitMs)
```

Change the `r.runTestCase(...)` call:

```go
result, ok := r.runTestCase(ctx, cfg, code, tc, timeout, i, passed, total)
```

Update `runTestCase` signature:

```go
func (r *DockerRunner) runTestCase(ctx context.Context, cfg dockerLangConfig, code string,
	tc domain.TestCase, timeout time.Duration, idx, passed, total int) (Result, bool) {
	execCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	// rest of the function unchanged
```

`compileCheck` is unchanged.

- [ ] **Step 6: Run the TLE test — expect green**

```bash
cd backend && go test ./internal/judge/... -run TestProcessRunner_RespectsTimeLimitMs -count=1 -v
```

Expected: PASS — the 100ms limit is now enforced.

- [ ] **Step 7: Run all judge tests**

```bash
cd backend && go test ./internal/judge/... -count=1 -v 2>&1 | tail -20
```

Expected: All existing tests still PASS.

- [ ] **Step 8: Run full backend test suite**

```bash
cd backend && go test ./... -count=1 2>&1 | tail -10
```

Expected: All packages PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/judge/judge.go backend/internal/judge/process_runner.go \
        backend/internal/judge/docker_runner.go backend/internal/judge/runner_test.go
git commit -m "feat: use per-problem TimeLimitMs in judge runners instead of global constant"
```

---

## Task 5: Frontend — time limit input in create and edit forms

**Files:**
- Modify: `frontend/src/types/problem.ts`
- Modify: `frontend/src/features/problems/api.ts`
- Modify: `frontend/src/pages/interviewer/index.tsx`

- [ ] **Step 1: Add `timeLimitMs` to `types/problem.ts`**

Replace the entire file:

```ts
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  testCases?: TestCase[];
  timeLimitMs?: number;
}
```

- [ ] **Step 2: Add `timeLimitMs` to `UpdateProblemPayload` in `api.ts`**

In `frontend/src/features/problems/api.ts`, replace the `UpdateProblemPayload` interface:

```ts
interface UpdateProblemPayload {
  title: string;
  difficulty: string;
  description: string;
  timeLimitMs?: number;
  testCases: { input: string; expected_output: string; isHidden?: boolean }[];
}
```

Also update `updateProblem` to pass `timeLimitMs` through (it already passes the whole `data` object so no change to the function body is needed).

- [ ] **Step 3: Add `timeLimitMs` and `onTimeLimitMsChange` to `ProblemFormFieldsProps` in `index.tsx`**

In `frontend/src/pages/interviewer/index.tsx`, add two props to the `ProblemFormFieldsProps` interface (after `onDescriptionChange`):

```ts
interface ProblemFormFieldsProps {
  readonly titleId: string;
  readonly titleValue: string;
  readonly onTitleChange: (v: string) => void;
  readonly difficultyValue: string;
  readonly onDifficultyChange: (v: string) => void;
  readonly descriptionId: string;
  readonly descriptionValue: string;
  readonly onDescriptionChange: (v: string) => void;
  readonly timeLimitMs: number;
  readonly onTimeLimitMsChange: (v: number) => void;
  readonly testCases: FormTestCase[];
  readonly onTestCaseChange: (index: number, field: "input" | "output", value: string) => void;
  readonly onAddTestCase: () => void;
  readonly onRemoveTestCase?: (index: number) => void;
  readonly onToggleHidden?: (index: number) => void;
}
```

- [ ] **Step 4: Add the time limit input to `ProblemFormFields` component**

In the `ProblemFormFields` function body, add a new `<div>` after the description `<div>` (after line 155, before the test cases section):

```tsx
<div>
  <label
    htmlFor="time-limit-ms"
    className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider"
  >
    Time Limit (ms)
  </label>
  <input
    id="time-limit-ms"
    type="number"
    min={100}
    value={timeLimitMs}
    onChange={(e) => onTimeLimitMsChange(Number(e.target.value))}
    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
  />
</div>
```

Also destructure the two new props in the function signature:

```tsx
function ProblemFormFields({
  titleId,
  titleValue,
  onTitleChange,
  difficultyValue,
  onDifficultyChange,
  descriptionId,
  descriptionValue,
  onDescriptionChange,
  timeLimitMs,
  onTimeLimitMsChange,
  testCases,
  onTestCaseChange,
  onAddTestCase,
  onRemoveTestCase,
  onToggleHidden,
}: ProblemFormFieldsProps) {
```

- [ ] **Step 5: Add state for create form in `InterviewerDashboard`**

Add after the existing `const [description, setDescription] = useState("")` line (~line 250):

```tsx
const [timeLimitMs, setTimeLimitMs] = useState<number>(5000);
```

- [ ] **Step 6: Add state for edit form**

Add after `const [editDescription, setEditDescription] = useState("")` (~line 265):

```tsx
const [editTimeLimitMs, setEditTimeLimitMs] = useState<number>(5000);
```

- [ ] **Step 7: Populate `editTimeLimitMs` when opening the edit modal**

In the `openEditProblem` function, after `setEditDescription(full.description)` (~line 403):

```tsx
setEditTimeLimitMs(full.timeLimitMs ?? 5000);
```

- [ ] **Step 8: Include `timeLimitMs` in `handleSubmitProblem`**

In `handleSubmitProblem`, replace the `problemData` object:

```tsx
const problemData = {
  title,
  difficulty,
  description,
  timeLimitMs,
  testCases: testCases.map((tc) => ({
    input: tc.input,
    expected_output: tc.output,
  })),
};
```

Also reset `timeLimitMs` after successful create (add after `setTestCases([...])`):

```tsx
setTimeLimitMs(5000);
```

- [ ] **Step 9: Include `editTimeLimitMs` in `handleSaveEdit`**

In `handleSaveEdit`, replace the `updateProblem` call:

```tsx
await updateProblem(String(editingProblem.id), {
  title: editTitle,
  difficulty: editDifficulty,
  description: editDescription,
  timeLimitMs: editTimeLimitMs,
  testCases: editTestCases.map((tc) => ({
    input: tc.input,
    expected_output: tc.output,
    isHidden: tc.isHidden,
  })),
});
```

- [ ] **Step 10: Pass new props to both `<ProblemFormFields>` usages**

In the create form JSX (~line 712):

```tsx
<ProblemFormFields
  titleId="create-title"
  titleValue={title}
  onTitleChange={setTitle}
  difficultyValue={difficulty}
  onDifficultyChange={setDifficulty}
  descriptionId="create-description"
  descriptionValue={description}
  onDescriptionChange={setDescription}
  timeLimitMs={timeLimitMs}
  onTimeLimitMsChange={setTimeLimitMs}
  testCases={testCases}
  onTestCaseChange={handleTestCaseChange}
  onAddTestCase={addTestCase}
/>
```

In the edit modal JSX (around line 831):

```tsx
<ProblemFormFields
  titleId="edit-title"
  titleValue={editTitle}
  onTitleChange={setEditTitle}
  difficultyValue={editDifficulty}
  onDifficultyChange={setEditDifficulty}
  descriptionId="edit-description"
  descriptionValue={editDescription}
  onDescriptionChange={setEditDescription}
  timeLimitMs={editTimeLimitMs}
  onTimeLimitMsChange={setEditTimeLimitMs}
  testCases={editTestCases}
  onTestCaseChange={handleEditTestCaseChange}
  onAddTestCase={() => setEditTestCases([...editTestCases, { input: "", output: "", uid: uid() }])}
  onRemoveTestCase={(i) => setEditTestCases((prev) => prev.filter((_, idx) => idx !== i))}
  onToggleHidden={toggleEditTestCaseHidden}
/>
```

- [ ] **Step 11: TypeScript compile check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/types/problem.ts \
        frontend/src/features/problems/api.ts \
        frontend/src/pages/interviewer/index.tsx
git commit -m "feat: add time limit input to create and edit problem forms"
```

---

## Task 6: Format, lint, and final verification

- [ ] **Step 1: Format Go code**

```bash
cd backend && gofmt -w ./internal/domain/problem.go ./internal/repository/problem_repo.go \
    ./internal/handler/problem.go ./internal/judge/judge.go \
    ./internal/judge/process_runner.go ./internal/judge/docker_runner.go
```

- [ ] **Step 2: Run golangci-lint**

```bash
/Users/farmerliong/go/bin/golangci-lint run ./... 2>&1 | head -30
```

Expected: No new lint errors.

- [ ] **Step 3: Run full backend test suite one final time**

```bash
cd backend && go test ./... -count=1 2>&1 | tail -15
```

Expected: All packages PASS.

- [ ] **Step 4: Commit lint fixes (if any)**

```bash
git add -u && git commit -m "style: fix formatting after per-problem time limit feature"
```

Only run this step if Step 2 produced changes. Otherwise skip.
