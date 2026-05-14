package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/judge"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type SubmissionService struct {
	repo        *repository.SubmissionRepo
	problemRepo *repository.ProblemRepo
	judge       *judge.Judge
	logger      *zap.Logger
}

func NewSubmissionService(
	repo *repository.SubmissionRepo,
	problemRepo *repository.ProblemRepo,
	j *judge.Judge,
	logger *zap.Logger,
) *SubmissionService {
	return &SubmissionService{repo: repo, problemRepo: problemRepo, judge: j, logger: logger}
}

func (s *SubmissionService) Create(problemID, code, language string) (domain.Submission, error) {
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
		ProblemID:      problemID,
		Code:           code,
		Language:       language,
		Status:         domain.StatusPending,
		TotalTestCases: len(prob.TestCases),
	}

	if err := s.repo.Save(sub); err != nil {
		return domain.Submission{}, err
	}

	go s.judgeAsync(sub, prob)

	return sub, nil
}

func (s *SubmissionService) GetByID(id string) (domain.Submission, bool) {
	return s.repo.GetByID(id)
}

func (s *SubmissionService) judgeAsync(sub domain.Submission, prob domain.Problem) {
	result := s.judge.Run(context.Background(), prob, sub.Code, sub.Language)
	sub.Status = result.Status
	sub.Output = result.Output
	sub.ExpectedOutput = result.ExpectedOutput
	sub.Error = result.Error
	sub.PassedTestCases = result.PassedTestCases
	sub.TotalTestCases = result.TotalTestCases
	if err := s.repo.Update(sub); err != nil {
		s.logger.Error("failed to update submission after judging",
			zap.String("id", sub.ID),
			zap.Error(err),
		)
	}
}

func randomID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
