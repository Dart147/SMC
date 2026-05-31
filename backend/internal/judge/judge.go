package judge

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

const (
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

// Judge delegates execution to a Runner. Concurrency is controlled by the worker pool.
type Judge struct {
	runner Runner
	logger *zap.Logger
}

func NewJudge(runner Runner, logger *zap.Logger) *Judge {
	return &Judge{runner: runner, logger: logger}
}

func (j *Judge) Run(ctx context.Context, prob domain.Problem, code, language string) Result {
	return j.runner.Run(ctx, prob, code, language)
}
