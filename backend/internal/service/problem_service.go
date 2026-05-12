package service

import (
	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type ProblemService struct {
	repo *repository.ProblemRepo
}

func NewProblemService(repo *repository.ProblemRepo) *ProblemService {
	return &ProblemService{repo: repo}
}

func (s *ProblemService) List() []domain.Problem {
	return s.repo.List()
}

func (s *ProblemService) GetByID(id string) (domain.Problem, bool) {
	return s.repo.GetByID(id)
}
