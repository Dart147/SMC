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

type Result struct {
	Status          string
	Output          string
	ExpectedOutput  string
	Error           string
	PassedTestCases int
	TotalTestCases  int
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
