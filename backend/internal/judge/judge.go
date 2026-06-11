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
	MemoryLimitBytes = 256 * 1024 * 1024 // 256 MB
)

func executionTimeout(ms int) time.Duration {
	if ms <= 0 {
		return ExecutionTimeout
	}
	return time.Duration(ms) * time.Millisecond
}

type Result struct {
	Status               string
	Output               string
	ExpectedOutput       string
	ExpectedOutputHidden bool // true when the failing test case has is_hidden=true
	Error                string
	PassedTestCases      int
	TotalTestCases       int
	ExecutionTimeMs      int // total wall-clock time across all executed test cases
}

// Judge wraps a Runner with a semaphore to cap concurrent executions.
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
