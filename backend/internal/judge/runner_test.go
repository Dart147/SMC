package judge

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

// sumProblem is a minimal two-integer addition problem used across all language tests.
var sumProblem = domain.Problem{
	ID:    1,
	Title: "sum",
	TestCases: []domain.TestCase{
		{Input: "1 2", ExpectedOutput: "3"},
		{Input: "10 20", ExpectedOutput: "30"},
		{Input: "-5 5", ExpectedOutput: "0"},
	},
}

var codeByLang = map[string]string{
	"python": "a, b = map(int, input().split())\nprint(a + b)\n",
	"javascript": `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split(/\s+/);
console.log(Number(lines[0]) + Number(lines[1]));`,
	"go": `package main
import "fmt"
func main() {
	var a, b int
	fmt.Scan(&a, &b)
	fmt.Println(a + b)
}`,
	"c": `#include <stdio.h>
int main() {
	int a, b;
	scanf("%d %d", &a, &b);
	printf("%d\n", a + b);
	return 0;
}`,
	"cpp": `#include <iostream>
using namespace std;
int main() {
	int a, b;
	cin >> a >> b;
	cout << a + b << endl;
	return 0;
}`,
}

var badCodeByLang = map[string]string{
	"c":   "#include <stdio.h>\nint main() { this is not valid C }",
	"cpp": "#include <iostream>\nint main() { this is not valid C++ }",
}

// ── ProcessRunner ────────────────────────────────────────────────────────────

func TestProcessRunner_C_Accepted(t *testing.T) {
	if _, err := exec.LookPath("gcc"); err != nil {
		t.Skip("gcc not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["c"], "c")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
	if res.PassedTestCases != res.TotalTestCases {
		t.Fatalf("want %d passed, got %d", res.TotalTestCases, res.PassedTestCases)
	}
}

func TestProcessRunner_C_CompileError(t *testing.T) {
	if _, err := exec.LookPath("gcc"); err != nil {
		t.Skip("gcc not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, badCodeByLang["c"], "c")
	if res.Status != domain.StatusCompileError {
		t.Fatalf("want Compile Error, got %q", res.Status)
	}
}

func TestProcessRunner_CPP_Accepted(t *testing.T) {
	if _, err := exec.LookPath("g++"); err != nil {
		t.Skip("g++ not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["cpp"], "cpp")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}

func TestProcessRunner_CPP_CompileError(t *testing.T) {
	if _, err := exec.LookPath("g++"); err != nil {
		t.Skip("g++ not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, badCodeByLang["cpp"], "cpp")
	if res.Status != domain.StatusCompileError {
		t.Fatalf("want Compile Error, got %q", res.Status)
	}
}

func TestProcessRunner_AllLanguages(t *testing.T) {
	prerequisites := map[string]string{
		"python":     "python3",
		"javascript": "node",
		"go":         "go",
		"c":          "gcc",
		"cpp":        "g++",
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)

	for lang, code := range codeByLang {
		bin := prerequisites[lang]
		if _, err := exec.LookPath(bin); err != nil {
			t.Logf("skipping %s: %s not found", lang, bin)
			continue
		}
		t.Run(lang, func(t *testing.T) {
			res := r.Run(context.Background(), sumProblem, code, lang)
			if res.Status != domain.StatusAccepted {
				t.Fatalf("want Accepted, got %q (error: %s, output: %s)", res.Status, res.Error, res.Output)
			}
		})
	}
}

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

// ── executionTimeout ─────────────────────────────────────────────────────────

func TestExecutionTimeout_ZeroUsesDefault(t *testing.T) {
	if got := executionTimeout(0); got != ExecutionTimeout {
		t.Errorf("want %v, got %v", ExecutionTimeout, got)
	}
}

func TestExecutionTimeout_NegativeUsesDefault(t *testing.T) {
	if got := executionTimeout(-1); got != ExecutionTimeout {
		t.Errorf("want %v, got %v", ExecutionTimeout, got)
	}
}

func TestExecutionTimeout_PositiveConvertsMs(t *testing.T) {
	if got := executionTimeout(2000); got != 2*time.Second {
		t.Errorf("want 2s, got %v", got)
	}
}

// ── Judge semaphore wrapper ───────────────────────────────────────────────────

type stubRunner struct{ result Result }

func (s stubRunner) Run(_ context.Context, _ domain.Problem, _, _ string) Result { return s.result }

func TestJudge_RunDelegatesAndReleaseSemaphore(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	want := Result{Status: domain.StatusAccepted, PassedTestCases: 1, TotalTestCases: 1}
	j := NewJudge(stubRunner{result: want}, logger)

	got := j.Run(context.Background(), domain.Problem{}, "", "python")
	if got.Status != want.Status {
		t.Errorf("want %q, got %q", want.Status, got.Status)
	}
	// Semaphore must be released — a second call should not block.
	done := make(chan struct{})
	go func() {
		j.Run(context.Background(), domain.Problem{}, "", "python")
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Error("semaphore not released after first Run")
	}
}

// ── ProcessRunner — Wrong Answer path ────────────────────────────────────────

func TestProcessRunner_WrongAnswer(t *testing.T) {
	if _, err := exec.LookPath("python3"); err != nil {
		t.Skip("python3 not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)

	prob := domain.Problem{
		ID:    10,
		Title: "wrong",
		TestCases: []domain.TestCase{
			{Input: "1 2", ExpectedOutput: "999"},
		},
	}
	res := r.Run(context.Background(), prob, "a, b = map(int, input().split())\nprint(a + b)\n", "python")
	if res.Status != domain.StatusWrongAnswer {
		t.Errorf("want WrongAnswer, got %q", res.Status)
	}
}

// ── DockerRunner (unit tests via fake docker binary) ─────────────────────────

// fakeDockerBin writes a shell script to a temp dir and returns its path.
// The script ignores all arguments and runs the provided snippet.
func fakeDockerBin(t *testing.T, script string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "docker")
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+script+"\n"), 0755); err != nil {
		t.Fatal(err)
	}
	return path
}

// setDockerBin overrides the package-level dockerBin for the duration of a test.
func setDockerBin(t *testing.T, bin string) {
	t.Helper()
	orig := dockerBin
	dockerBin = bin
	t.Cleanup(func() { dockerBin = orig })
}

func TestDockerRunner_Run_UnsupportedLanguage(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	res := r.Run(context.Background(), domain.Problem{TestCases: []domain.TestCase{{}}}, "", "brainfuck")
	if res.Status != domain.StatusRuntimeError {
		t.Errorf("want RuntimeError, got %q", res.Status)
	}
}

func TestDockerRunner_Run_NoTestCases(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	res := r.Run(context.Background(), domain.Problem{}, "", "python")
	if res.Status != domain.StatusAccepted {
		t.Errorf("want Accepted, got %q", res.Status)
	}
}

func TestDockerRunner_pullImages_Success(t *testing.T) {
	setDockerBin(t, fakeDockerBin(t, "exit 0"))
	logger, _ := zap.NewDevelopment()
	_ = NewDockerRunner(logger) // triggers pullImages; fake docker exits 0 → success path
}

func TestDockerRunner_runTestCase_Accepted(t *testing.T) {
	setDockerBin(t, fakeDockerBin(t, "echo 3"))
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	prob := domain.Problem{
		TestCases: []domain.TestCase{{Input: "1 2", ExpectedOutput: "3"}},
	}
	res := r.Run(context.Background(), prob, "code", "python")
	if res.Status != domain.StatusAccepted {
		t.Errorf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}

func TestDockerRunner_runTestCase_WrongAnswer(t *testing.T) {
	setDockerBin(t, fakeDockerBin(t, "echo 999"))
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	prob := domain.Problem{
		TestCases: []domain.TestCase{{Input: "1 2", ExpectedOutput: "3"}},
	}
	res := r.Run(context.Background(), prob, "code", "python")
	if res.Status != domain.StatusWrongAnswer {
		t.Errorf("want WrongAnswer, got %q", res.Status)
	}
}

func TestDockerRunner_runTestCase_RuntimeError(t *testing.T) {
	setDockerBin(t, fakeDockerBin(t, "exit 1"))
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	prob := domain.Problem{
		TestCases: []domain.TestCase{{Input: "", ExpectedOutput: "anything"}},
	}
	res := r.Run(context.Background(), prob, "code", "python")
	if res.Status != domain.StatusRuntimeError {
		t.Errorf("want RuntimeError, got %q", res.Status)
	}
}

func TestDockerRunner_runTestCase_TimeLimitExceeded(t *testing.T) {
	setDockerBin(t, fakeDockerBin(t, "sleep 60"))
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	prob := domain.Problem{
		TimeLimitMs: 100,
		TestCases:   []domain.TestCase{{Input: "", ExpectedOutput: ""}},
	}
	res := r.Run(context.Background(), prob, "code", "python")
	if res.Status != domain.StatusTimeLimitExceeded {
		t.Errorf("want TimeLimitExceeded, got %q", res.Status)
	}
}

func TestDockerRunner_compileCheck_Failure(t *testing.T) {
	setDockerBin(t, fakeDockerBin(t, "exit 1"))
	logger, _ := zap.NewDevelopment()
	r := &DockerRunner{logger: logger}
	prob := domain.Problem{
		TestCases: []domain.TestCase{{Input: "", ExpectedOutput: ""}},
	}
	// "c" has compiled=true, so compileCheck runs first and returns CompileError
	res := r.Run(context.Background(), prob, "bad code", "c")
	if res.Status != domain.StatusCompileError {
		t.Errorf("want CompileError, got %q", res.Status)
	}
}

// ── DockerRunner (integration tests, skipped without real Docker) ─────────────

func dockerImagePresent(image string) bool {
	out, err := exec.Command("docker", "image", "inspect", image).CombinedOutput()
	return err == nil && len(out) > 2
}

func TestDockerRunner_C_Accepted(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("docker not found on PATH")
	}
	if !dockerImagePresent("gcc:14") {
		t.Skip("gcc:14 image not pulled — run: docker pull gcc:14")
	}
	logger, _ := zap.NewDevelopment()
	r := NewDockerRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["c"], "c")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}

func TestDockerRunner_CPP_Accepted(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("docker not found on PATH")
	}
	if !dockerImagePresent("gcc:14") {
		t.Skip("gcc:14 image not pulled — run: docker pull gcc:14")
	}
	logger, _ := zap.NewDevelopment()
	r := NewDockerRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["cpp"], "cpp")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}
