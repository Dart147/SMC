package service

import (
	"context"
	"errors"
	"testing"

	"go.uber.org/zap"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/judge"
)

// ── mock submission repo ─────────────────────────────────────────────────────

type mockSubmissionRepo struct {
	saveErr       error
	updateErr     error
	getByIDResult domain.Submission
	getByIDFound  bool
	listResult    []domain.Submission
	latestResult  domain.Submission
	latestFound   bool
	claimResult   *domain.Submission
	claimErr      error
	listByUserID  []domain.Submission
	reportRow     sqlcdb.GetSubmissionReportRow
	reportErr     error
	updatedSub    *domain.Submission
}

func (m *mockSubmissionRepo) Save(s domain.Submission) error { return m.saveErr }
func (m *mockSubmissionRepo) Update(s domain.Submission) error {
	m.updatedSub = &s
	return m.updateErr
}
func (m *mockSubmissionRepo) GetByID(id string) (domain.Submission, bool) {
	return m.getByIDResult, m.getByIDFound
}
func (m *mockSubmissionRepo) List() []domain.Submission { return m.listResult }
func (m *mockSubmissionRepo) GetLatestByProblem(problemID string) (domain.Submission, bool) {
	return m.latestResult, m.latestFound
}
func (m *mockSubmissionRepo) ClaimNext(ctx context.Context) (*domain.Submission, error) {
	return m.claimResult, m.claimErr
}
func (m *mockSubmissionRepo) ListByUserID(userID string) []domain.Submission {
	return m.listByUserID
}
func (m *mockSubmissionRepo) GetReport(ctx context.Context, id string) (sqlcdb.GetSubmissionReportRow, error) {
	return m.reportRow, m.reportErr
}

// ── mock judge runner ────────────────────────────────────────────────────────

type mockRunner struct {
	result judge.Result
}

func (m *mockRunner) Run(ctx context.Context, prob domain.Problem, code, language string) judge.Result {
	return m.result
}

// ── helpers ──────────────────────────────────────────────────────────────────

func newSvc(subRepo submissionRepo, probRepo problemRepo, runner judge.Runner) *SubmissionService {
	return NewSubmissionService(subRepo, probRepo, runner, zap.NewNop(), nil)
}

func sampleProblem() domain.Problem {
	return domain.Problem{
		ID:    1,
		Title: "Two Sum",
		TestCases: []domain.TestCase{
			{Input: "2 7\n9\n", ExpectedOutput: "0 1\n", IsHidden: false},
		},
	}
}

// ── Create ───────────────────────────────────────────────────────────────────

func TestSubmissionService_Create_ProblemNotFound(t *testing.T) {
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{found: false}, &mockRunner{})
	_, err := svc.Create("p1", "print(1)", "python", "u1")
	if err == nil {
		t.Fatal("expected error for missing problem")
	}
}

func TestSubmissionService_Create_Success(t *testing.T) {
	prob := sampleProblem()
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{prob: prob, found: true}, &mockRunner{})
	sub, err := svc.Create("1", "print(1)", "python", "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub.ProblemID != "1" {
		t.Errorf("ProblemID: got %q, want '1'", sub.ProblemID)
	}
	if sub.Status != domain.StatusPending {
		t.Errorf("Status: got %q, want Pending", sub.Status)
	}
	if sub.TotalTestCases != 1 {
		t.Errorf("TotalTestCases: got %d, want 1", sub.TotalTestCases)
	}
	if sub.ID == "" {
		t.Error("ID should not be empty")
	}
}

func TestSubmissionService_Create_SaveError(t *testing.T) {
	prob := sampleProblem()
	subRepo := &mockSubmissionRepo{saveErr: errors.New("db error")}
	svc := newSvc(subRepo, &mockProblemRepo{prob: prob, found: true}, &mockRunner{})
	_, err := svc.Create("1", "code", "go", "u1")
	if err == nil {
		t.Fatal("expected error from repo.Save")
	}
}

// ── GetByID, List, GetLatestByProblem, ListByUserID ──────────────────────────

func TestSubmissionService_GetByID_Found(t *testing.T) {
	expected := domain.Submission{ID: "s1", Status: domain.StatusAccepted}
	svc := newSvc(&mockSubmissionRepo{getByIDResult: expected, getByIDFound: true}, &mockProblemRepo{}, &mockRunner{})
	got, ok := svc.GetByID("s1")
	if !ok {
		t.Fatal("expected found=true")
	}
	if got.ID != "s1" {
		t.Errorf("ID: got %q", got.ID)
	}
}

func TestSubmissionService_GetByID_NotFound(t *testing.T) {
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{}, &mockRunner{})
	_, ok := svc.GetByID("missing")
	if ok {
		t.Error("expected found=false")
	}
}

func TestSubmissionService_List(t *testing.T) {
	subs := []domain.Submission{{ID: "s1"}, {ID: "s2"}}
	svc := newSvc(&mockSubmissionRepo{listResult: subs}, &mockProblemRepo{}, &mockRunner{})
	got := svc.List()
	if len(got) != 2 {
		t.Errorf("List: got %d, want 2", len(got))
	}
}

func TestSubmissionService_GetLatestByProblem(t *testing.T) {
	expected := domain.Submission{ID: "s5", ProblemID: "p1"}
	svc := newSvc(&mockSubmissionRepo{latestResult: expected, latestFound: true}, &mockProblemRepo{}, &mockRunner{})
	got, ok := svc.GetLatestByProblem("p1")
	if !ok {
		t.Fatal("expected found=true")
	}
	if got.ID != "s5" {
		t.Errorf("ID: got %q, want s5", got.ID)
	}
}

func TestSubmissionService_ListByUserID(t *testing.T) {
	subs := []domain.Submission{{ID: "s1", UserID: "u1"}}
	svc := newSvc(&mockSubmissionRepo{listByUserID: subs}, &mockProblemRepo{}, &mockRunner{})
	got := svc.ListByUserID("u1")
	if len(got) != 1 {
		t.Errorf("ListByUserID: got %d, want 1", len(got))
	}
}

// ── RunNext ──────────────────────────────────────────────────────────────────

func TestSubmissionService_RunNext_EmptyQueue(t *testing.T) {
	svc := newSvc(&mockSubmissionRepo{claimResult: nil}, &mockProblemRepo{}, &mockRunner{})
	if svc.RunNext(context.Background()) {
		t.Error("expected false for empty queue")
	}
}

func TestSubmissionService_RunNext_ClaimError(t *testing.T) {
	subRepo := &mockSubmissionRepo{claimErr: errors.New("db error")}
	svc := newSvc(subRepo, &mockProblemRepo{}, &mockRunner{})
	if svc.RunNext(context.Background()) {
		t.Error("expected false when ClaimNext returns error")
	}
}

func TestSubmissionService_RunNext_ProblemNotFound_SetsError(t *testing.T) {
	sub := &domain.Submission{ID: "s1", ProblemID: "p-missing", TotalTestCases: 1}
	subRepo := &mockSubmissionRepo{claimResult: sub}
	svc := newSvc(subRepo, &mockProblemRepo{found: false}, &mockRunner{})
	if !svc.RunNext(context.Background()) {
		t.Error("expected true (work was done)")
	}
	if subRepo.updatedSub == nil {
		t.Fatal("expected Update to be called")
	}
	if subRepo.updatedSub.Status != domain.StatusRuntimeError {
		t.Errorf("Status: got %q, want RuntimeError", subRepo.updatedSub.Status)
	}
}

func TestSubmissionService_RunNext_JudgesAndUpdates(t *testing.T) {
	prob := sampleProblem()
	sub := &domain.Submission{ID: "s1", ProblemID: "1", Language: "python", TotalTestCases: 1}
	subRepo := &mockSubmissionRepo{claimResult: sub}
	runner := &mockRunner{result: judge.Result{
		Status: domain.StatusAccepted, PassedTestCases: 1,
	}}
	svc := newSvc(subRepo, &mockProblemRepo{prob: prob, found: true}, runner)
	if !svc.RunNext(context.Background()) {
		t.Error("expected true")
	}
	if subRepo.updatedSub == nil {
		t.Fatal("expected Update to be called")
	}
	if subRepo.updatedSub.Status != domain.StatusAccepted {
		t.Errorf("Status: got %q, want Accepted", subRepo.updatedSub.Status)
	}
	if subRepo.updatedSub.Score != 100 {
		t.Errorf("Score: got %d, want 100", subRepo.updatedSub.Score)
	}
}

// ── RunSample ────────────────────────────────────────────────────────────────

func TestSubmissionService_RunSample_ProblemNotFound(t *testing.T) {
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{found: false}, &mockRunner{})
	_, err := svc.RunSample(context.Background(), "p1", "code", "python")
	if err == nil {
		t.Fatal("expected error for missing problem")
	}
}

func TestSubmissionService_RunSample_NoSampleCases(t *testing.T) {
	prob := domain.Problem{ID: 1, TestCases: []domain.TestCase{
		{Input: "x", ExpectedOutput: "y", IsHidden: true}, // hidden only
	}}
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{prob: prob, found: true}, &mockRunner{})
	_, err := svc.RunSample(context.Background(), "1", "code", "python")
	if err == nil {
		t.Fatal("expected error when no visible sample")
	}
}

func TestSubmissionService_RunSample_Success(t *testing.T) {
	prob := sampleProblem()
	runner := &mockRunner{result: judge.Result{
		Status: domain.StatusAccepted, Output: "0 1\n", ExpectedOutput: "0 1\n",
	}}
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{prob: prob, found: true}, runner)
	result, err := svc.RunSample(context.Background(), "1", "code", "python")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != domain.StatusAccepted {
		t.Errorf("Status: got %q, want Accepted", result.Status)
	}
}

func TestSubmissionService_RunSample_FillsExpectedOutput(t *testing.T) {
	prob := sampleProblem()
	// Runner returns empty expected output — should be filled from sample
	runner := &mockRunner{result: judge.Result{
		Status: domain.StatusAccepted, ExpectedOutput: "",
	}}
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{prob: prob, found: true}, runner)
	result, err := svc.RunSample(context.Background(), "1", "code", "python")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ExpectedOutput != prob.TestCases[0].ExpectedOutput {
		t.Errorf("ExpectedOutput: got %q, want %q", result.ExpectedOutput, prob.TestCases[0].ExpectedOutput)
	}
}

// ── calculateAdvancedScore ────────────────────────────────────────────────────

func TestCalculateAdvancedScore_CleanCode_NoDeductions(t *testing.T) {
	svc := &SubmissionService{logger: zap.NewNop()}
	code := `package main

func twoSum(nums []int, target int) []int {
	for i := 0; i < len(nums); i++ {
		for j := i + 1; j < len(nums); j++ {
			if nums[i]+nums[j] == target {
				return []int{i, j}
			}
		}
	}
	return nil
}`
	score := svc.calculateAdvancedScore(code, 100)
	if score != 100 {
		t.Errorf("clean code: got %d, want 100", score)
	}
}

func TestCalculateAdvancedScore_HighComplexity_Deduction(t *testing.T) {
	svc := &SubmissionService{logger: zap.NewNop()}
	// Build a function with >10 if/for/range/switch statements
	code := `package main

func complex() {
	if true {}
	if true {}
	if true {}
	if true {}
	if true {}
	if true {}
	if true {}
	if true {}
	if true {}
	if true {}
	if true {} // 11th - triggers penalty
}`
	score := svc.calculateAdvancedScore(code, 80)
	if score != 70 {
		t.Errorf("high complexity: got %d, want 70 (80-10)", score)
	}
}

func TestCalculateAdvancedScore_SingleLetterIdent_Deduction(t *testing.T) {
	svc := &SubmissionService{logger: zap.NewNop()}
	// 'x' is a single-letter non-exempt identifier
	code := `package main

func foo() {
	x := 1
	_ = x
}`
	score := svc.calculateAdvancedScore(code, 100)
	// Each unique identifier occurrence with len==1 (not i/j/k) deducts 2
	if score >= 100 {
		t.Errorf("single-letter ident: got %d, expected deduction from 100", score)
	}
}

func TestCalculateAdvancedScore_ExemptIdents_NoDeduction(t *testing.T) {
	svc := &SubmissionService{logger: zap.NewNop()}
	// i, j, k are exempt from single-letter penalty
	code := `package main

func foo() {
	for i := 0; i < 10; i++ {
		for j := i; j < 10; j++ {
			_ = i + j
		}
	}
}`
	score := svc.calculateAdvancedScore(code, 100)
	if score != 100 {
		t.Errorf("exempt idents: got %d, want 100", score)
	}
}

func TestCalculateAdvancedScore_InvalidGoCode_ReturnsBaseScore(t *testing.T) {
	svc := &SubmissionService{logger: zap.NewNop()}
	score := svc.calculateAdvancedScore("this is not go code !!!!", 75)
	if score != 75 {
		t.Errorf("invalid code: got %d, want 75 (base score)", score)
	}
}

func TestCalculateAdvancedScore_FloorAtZero(t *testing.T) {
	svc := &SubmissionService{logger: zap.NewNop()}
	// Many single-letter non-exempt variables to drive score below 0
	code := `package main

func foo() {
	a := 1; b := 2; c := 3; d := 4; e := 5
	f := 6; g := 7; h := 8; l := 9; m := 10
	_ = a+b+c+d+e+f+g+h+l+m
}`
	score := svc.calculateAdvancedScore(code, 5) // low base score
	if score < 0 {
		t.Errorf("score should not go below 0, got %d", score)
	}
}

// ── judgeAndUpdate: score paths ───────────────────────────────────────────────

func TestSubmissionService_JudgeAndUpdate_NonGoLanguage_UsesBaseScore(t *testing.T) {
	prob := sampleProblem()
	sub := &domain.Submission{ID: "s1", ProblemID: "1", Language: "python", TotalTestCases: 1}
	subRepo := &mockSubmissionRepo{claimResult: sub}
	runner := &mockRunner{result: judge.Result{
		Status: domain.StatusAccepted, PassedTestCases: 1,
	}}
	svc := newSvc(subRepo, &mockProblemRepo{prob: prob, found: true}, runner)
	svc.RunNext(context.Background())
	if subRepo.updatedSub.Score != 100 {
		t.Errorf("non-Go accepted score: got %d, want 100", subRepo.updatedSub.Score)
	}
}

func TestSubmissionService_JudgeAndUpdate_GoAccepted_UsesAdvancedScore(t *testing.T) {
	prob := sampleProblem()
	sub := &domain.Submission{
		ID: "s1", ProblemID: "1", Language: "go", TotalTestCases: 1,
		Code: `package main
func main() {}`,
	}
	subRepo := &mockSubmissionRepo{claimResult: sub}
	runner := &mockRunner{result: judge.Result{
		Status: domain.StatusAccepted, PassedTestCases: 1,
	}}
	svc := newSvc(subRepo, &mockProblemRepo{prob: prob, found: true}, runner)
	svc.RunNext(context.Background())
	// Go + Accepted calls calculateAdvancedScore; clean code should keep 100
	if subRepo.updatedSub.Score < 0 || subRepo.updatedSub.Score > 100 {
		t.Errorf("Go accepted score out of range: %d", subRepo.updatedSub.Score)
	}
}

func TestSubmissionService_JudgeAndUpdate_NoTestCases_AcceptedGets100(t *testing.T) {
	prob := domain.Problem{ID: 1, TestCases: []domain.TestCase{}}
	sub := &domain.Submission{ID: "s1", ProblemID: "1", Language: "python", TotalTestCases: 0}
	subRepo := &mockSubmissionRepo{claimResult: sub}
	runner := &mockRunner{result: judge.Result{Status: domain.StatusAccepted}}
	svc := newSvc(subRepo, &mockProblemRepo{prob: prob, found: true}, runner)
	svc.RunNext(context.Background())
	if subRepo.updatedSub.Score != 100 {
		t.Errorf("no test cases + accepted: got score %d, want 100", subRepo.updatedSub.Score)
	}
}

func TestSubmissionService_JudgeAndUpdate_WrongAnswer_PartialScore(t *testing.T) {
	prob := domain.Problem{ID: 1, TestCases: []domain.TestCase{{}, {}}}
	sub := &domain.Submission{ID: "s1", ProblemID: "1", Language: "python", TotalTestCases: 2}
	subRepo := &mockSubmissionRepo{claimResult: sub}
	runner := &mockRunner{result: judge.Result{
		Status: domain.StatusWrongAnswer, PassedTestCases: 1,
	}}
	svc := newSvc(subRepo, &mockProblemRepo{prob: prob, found: true}, runner)
	svc.RunNext(context.Background())
	if subRepo.updatedSub.Score != 50 {
		t.Errorf("partial score: got %d, want 50", subRepo.updatedSub.Score)
	}
}

// ── GetReportByID ─────────────────────────────────────────────────────────────

func TestSubmissionService_GetReportByID_Success(t *testing.T) {
	row := sqlcdb.GetSubmissionReportRow{
		ID:           "s1",
		Username:     "alice",
		WarningCount: 0,
		IsSuspicious: false,
	}
	svc := newSvc(&mockSubmissionRepo{reportRow: row}, &mockProblemRepo{}, &mockRunner{})
	result, err := svc.GetReportByID("s1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	m, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("expected map result")
	}
	if m["id"] != "s1" {
		t.Errorf("id: got %v", m["id"])
	}
	if m["username"] != "alice" {
		t.Errorf("username: got %v", m["username"])
	}
}

func TestSubmissionService_GetReportByID_Error(t *testing.T) {
	svc := newSvc(&mockSubmissionRepo{reportErr: errors.New("not found")}, &mockProblemRepo{}, &mockRunner{})
	_, err := svc.GetReportByID("missing")
	if err == nil {
		t.Fatal("expected error")
	}
}
