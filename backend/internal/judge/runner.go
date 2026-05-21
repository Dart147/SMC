package judge

import (
	"context"

	"github.com/Dart147/SMC/backend/internal/domain"
)

// Runner executes user-submitted code against a problem and returns a Result.
type Runner interface {
	Run(ctx context.Context, prob domain.Problem, code, language string) Result
}
