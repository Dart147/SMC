package judge

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

const (
	MaxConcurrent    = 4
	ExecutionTimeout = 5 * time.Second
	MemoryLimitBytes = 256 * 1024 * 1024 // 256 MB
)

type Result struct {
	Status          string
	Output          string
	ExpectedOutput  string
	Error           string
	PassedTestCases int
	TotalTestCases  int
}

type langConfig struct {
	binary   string
	args     []string
	ext      string
	compiled bool // true means a compile check runs before test cases
}

var langConfigs = map[string]langConfig{
	"python":     {binary: "python3", args: nil, ext: ".py", compiled: false},
	"javascript": {binary: "node", args: nil, ext: ".js", compiled: false},
	"go":         {binary: "go", args: []string{"run"}, ext: ".go", compiled: true},
}

type Judge struct {
	// Docker isolation is the planned next step; this is process-level isolation only.
	sem    chan struct{}
	logger *zap.Logger
}

func NewJudge(logger *zap.Logger) *Judge {
	return &Judge{
		sem:    make(chan struct{}, MaxConcurrent),
		logger: logger,
	}
}

func (j *Judge) Run(ctx context.Context, prob domain.Problem, code, language string) Result {
	j.sem <- struct{}{}
	defer func() { <-j.sem }()

	cfg, ok := langConfigs[language]
	if !ok {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          fmt.Sprintf("unsupported language: %q", language),
			TotalTestCases: len(prob.TestCases),
		}
	}

	if len(prob.TestCases) == 0 {
		return Result{
			Status: domain.StatusAccepted,
			Output: "no test cases defined",
		}
	}

	tmpFile, err := os.CreateTemp("", "smc-*"+cfg.ext)
	if err != nil {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to create temp file",
			TotalTestCases: len(prob.TestCases),
		}
	}
	defer func() {
		if err := os.Remove(tmpFile.Name()); err != nil {
			j.logger.Warn("temp file cleanup",
				zap.String("path", tmpFile.Name()),
				zap.Error(err))
		}
	}()

	if _, err := tmpFile.WriteString(code); err != nil {
		if cerr := tmpFile.Close(); cerr != nil {
			j.logger.Warn("temp file close after write error", zap.Error(cerr))
		}
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to write code",
			TotalTestCases: len(prob.TestCases),
		}
	}
	if err := tmpFile.Close(); err != nil {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to close temp file",
			TotalTestCases: len(prob.TestCases),
		}
	}

	total := len(prob.TestCases)

	// Compile check for languages with an explicit compile step.
	if cfg.compiled {
		if result, failed := j.compileCheck(ctx, cfg, tmpFile.Name(), total); failed {
			return result
		}
	}

	passed := 0
	for i, tc := range prob.TestCases {
		result, ok := j.runTestCase(ctx, cfg, tmpFile.Name(), tc, i, passed, total)
		if !ok {
			return result
		}
		passed++
	}

	return Result{
		Status:          domain.StatusAccepted,
		PassedTestCases: passed,
		TotalTestCases:  total,
	}
}

// compileCheck runs a compile-only pass (go build) to catch CE before test cases.
// Returns (result, true) if compilation failed, (zero, false) if it succeeded.
func (j *Judge) compileCheck(ctx context.Context, cfg langConfig, file string, total int) (Result, bool) {
	compileCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	// "go build -o /dev/null <file>" — no shell
	cmd := exec.CommandContext(compileCtx, "go", "build", "-o", os.DevNull, file)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return Result{
			Status:         domain.StatusCompileError,
			Error:          stderr.String(),
			TotalTestCases: total,
		}, true
	}
	return Result{}, false
}

// runTestCase executes one test case. Returns (result, false) on any failure, (zero, true) on pass.
func (j *Judge) runTestCase(ctx context.Context, cfg langConfig, file string, tc domain.TestCase, idx, passed, total int) (Result, bool) {
	execCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	args := append(cfg.args, file) //nolint:gocritic
	cmd := exec.CommandContext(execCtx, cfg.binary, args...)
	cmd.Stdin = strings.NewReader(tc.Input)
	cmd.Dir = os.TempDir()

	applyMemoryLimit(cmd, MemoryLimitBytes)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()

	if execCtx.Err() == context.DeadlineExceeded {
		return Result{
			Status:          domain.StatusTimeLimitExceeded,
			Error:           fmt.Sprintf("test case %d timed out", idx+1),
			PassedTestCases: passed,
			TotalTestCases:  total,
		}, false
	}

	if isMemoryLimitExceeded(cmd, runErr) {
		return Result{
			Status:          domain.StatusMemoryLimitExceeded,
			Error:           fmt.Sprintf("test case %d exceeded memory limit", idx+1),
			PassedTestCases: passed,
			TotalTestCases:  total,
		}, false
	}

	if runErr != nil {
		return Result{
			Status:          domain.StatusRuntimeError,
			Output:          stdout.String(),
			Error:           strings.TrimSpace(stderr.String()),
			PassedTestCases: passed,
			TotalTestCases:  total,
		}, false
	}

	actual := strings.TrimRight(stdout.String(), "\n\r ")
	expected := strings.TrimRight(tc.ExpectedOutput, "\n\r ")
	if actual != expected {
		return Result{
			Status:          domain.StatusWrongAnswer,
			Output:          stdout.String(),
			ExpectedOutput:  tc.ExpectedOutput,
			Error:           fmt.Sprintf("test case %d failed", idx+1),
			PassedTestCases: passed,
			TotalTestCases:  total,
		}, false
	}

	return Result{}, true
}
