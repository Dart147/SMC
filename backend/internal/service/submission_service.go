package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/judge"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type SubmissionService struct {
	repo        *repository.SubmissionRepo
	problemRepo *repository.ProblemRepo
	judge       judge.Runner
	logger      *zap.Logger
}

func NewSubmissionService(
	repo *repository.SubmissionRepo,
	problemRepo *repository.ProblemRepo,
	j judge.Runner,
	logger *zap.Logger,
) *SubmissionService {
	return &SubmissionService{repo: repo, problemRepo: problemRepo, judge: j, logger: logger}
}

func (s *SubmissionService) GetByID(id string) (domain.Submission, bool) {
	return s.repo.GetByID(id)
}

func (s *SubmissionService) Create(problemID, code, language string, userID string) (domain.Submission, error) {
	prob, ok := s.problemRepo.GetByID(problemID)
	if !ok {
		return domain.Submission{}, fmt.Errorf("problem %q not found", problemID)
	}

	id, err := randomID()
	if err != nil {
		return domain.Submission{}, fmt.Errorf("generate submission ID: %w", err)
	}

	sub := domain.Submission{
		ID:             id,
		UserID:         userID,
		ProblemID:      problemID,
		Code:           code,
		Language:       language,
		Status:         domain.StatusPending,
		TotalTestCases: len(prob.TestCases),
	}

	if err := s.repo.Save(sub); err != nil {
		return domain.Submission{}, err
	}

	return sub, nil
}

func (s *SubmissionService) RunNext(ctx context.Context) bool {
	sub, err := s.repo.ClaimNext(ctx)
	if err != nil {
		s.logger.Error("failed to claim submission", zap.Error(err))
		return false
	}
	if sub == nil {
		return false
	}

	prob, ok := s.problemRepo.GetByID(sub.ProblemID)
	if !ok {
		sub.Status = domain.StatusRuntimeError
		sub.Error = "problem not found"
		_ = s.repo.Update(*sub)
		return true
	}

	s.judgeAsync(*sub, prob)
	return true
}

func (s *SubmissionService) judgeAsync(sub domain.Submission, prob domain.Problem) {
	result := s.judge.Run(context.Background(), prob, sub.Code, sub.Language)

	sub.Status = result.Status
	sub.Output = result.Output
	if !result.ExpectedOutputHidden {
		sub.ExpectedOutput = result.ExpectedOutput
	}
	sub.Error = result.Error
	sub.PassedTestCases = result.PassedTestCases

	// 🌟 關鍵修正：讓前端拿得到 "1/1" 字串
	sub.TestCases = fmt.Sprintf("%d/%d", result.PassedTestCases, sub.TotalTestCases)

	baseScore := 0
	if sub.TotalTestCases > 0 {
		baseScore = (sub.PassedTestCases * 100) / sub.TotalTestCases
	} else if sub.Status == domain.StatusAccepted {
		baseScore = 100
	}

	if sub.Language == "go" && sub.Status == domain.StatusAccepted {
		sub.Score = s.calculateAdvancedScore(sub.Code, baseScore)
	} else {
		sub.Score = baseScore
	}

	if err := s.repo.Update(sub); err != nil {
		s.logger.Error("Failed to update submission", zap.Error(err))
	}
}

func (s *SubmissionService) calculateAdvancedScore(code string, baseScore int) int {
	finalScore := baseScore
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "", code, 0)
	if err != nil {
		return finalScore
	}
	complexity := 0
	ast.Inspect(f, func(n ast.Node) bool {
		switch n.(type) {
		case *ast.IfStmt, *ast.ForStmt, *ast.RangeStmt, *ast.SwitchStmt:
			complexity++
		}
		return true
	})
	if complexity > 10 {
		finalScore -= 10
	}
	ast.Inspect(f, func(n ast.Node) bool {
		if ident, ok := n.(*ast.Ident); ok {
			if ident.Obj != nil && len(ident.Name) == 1 {
				if ident.Name != "i" && ident.Name != "j" && ident.Name != "k" {
					finalScore -= 2
				}
			}
		}
		return true
	})
	if finalScore < 0 {
		finalScore = 0
	}
	return finalScore
}

func randomID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// RunSample judges code against the first sample test case only. No DB write.
func (s *SubmissionService) RunSample(ctx context.Context, problemID, code, language string) (judge.Result, error) {
	prob, ok := s.problemRepo.GetByID(problemID)
	if !ok {
		return judge.Result{}, fmt.Errorf("problem %q not found", problemID)
	}
	sample, ok := prob.FirstSample()
	if !ok {
		return judge.Result{}, fmt.Errorf("problem %q has no sample test cases", problemID)
	}
	// Run against a synthetic problem containing only the sample case.
	sampleProb := domain.Problem{
		ID:        prob.ID,
		TestCases: []domain.TestCase{sample},
	}
	result := s.judge.Run(ctx, sampleProb, code, language)
	// Always carry the expected output so the UI can show it on Accepted too.
	if result.ExpectedOutput == "" {
		result.ExpectedOutput = sample.ExpectedOutput
	}
	return result, nil
}

func (s *SubmissionService) List() []domain.Submission {
	return s.repo.List()
}

// GetLatestByProblem 獲取題目最新提交紀錄
func (s *SubmissionService) GetLatestByProblem(problemID string) (domain.Submission, bool) {
	return s.repo.GetLatestByProblem(problemID)
}

func (s *SubmissionService) ListByUserID(userID string) []domain.Submission {
	return s.repo.ListByUserID(userID)
}

func (s *SubmissionService) GetReportByID(id string) (interface{}, error) {
	ctx := context.Background()
	report, err := s.repo.GetReport(ctx, id)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":              report.ID,
		"problemId":       report.ProblemID.String,
		"userId":          report.UserID.String,
		"username":        report.Username,
		"code":            report.Code,
		"language":        report.Language,
		"status":          report.Status.String,
		"passedTestCases": report.PassedTestCases.Int32,
		"totalTestCases":  report.TotalTestCases.Int32,
		"score":           report.Score.Int32,
		"createdAt":       report.CreatedAt.Time,
		"warningCount":    report.WarningCount,
		"isSuspicious":    report.IsSuspicious,
	}, nil
}
