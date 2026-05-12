package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type SubmissionService struct {
	repo *repository.SubmissionRepo
}

func NewSubmissionService(repo *repository.SubmissionRepo) *SubmissionService {
	return &SubmissionService{repo: repo}
}

func (s *SubmissionService) Create(problemID, code, language string) (domain.Submission, error) {
	id, err := randomID()
	if err != nil {
		return domain.Submission{}, fmt.Errorf("generate submission ID: %w", err)
	}

	sub := domain.Submission{
		ID:        id,
		ProblemID: problemID,
		Code:      code,
		Language:  language,
		Status:    domain.StatusPending,
	}

	if err := s.repo.Save(sub); err != nil {
		return domain.Submission{}, err
	}
	return sub, nil
}

func (s *SubmissionService) GetByID(id string) (domain.Submission, bool) {
	return s.repo.GetByID(id)
}

func randomID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
