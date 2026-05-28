package service

import (
	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type ReportService struct {
	repo *repository.ReportRepo
}

func NewReportService(repo *repository.ReportRepo) *ReportService {
	return &ReportService{repo: repo}
}

// GetCandidateScores 回傳所有考生的得分彙總
func (s *ReportService) GetCandidateScores() ([]domain.CandidateScore, error) {
	return s.repo.GetCandidateScores()
}
