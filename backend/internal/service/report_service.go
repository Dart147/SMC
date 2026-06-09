package service

import (
	"github.com/Dart147/SMC/backend/internal/domain"
)

type ReportService struct {
	repo reportRepo
}

func NewReportService(repo reportRepo) *ReportService {
	return &ReportService{repo: repo}
}

// GetCandidateScores 回傳所有考生的得分彙總
func (s *ReportService) GetCandidateScores() ([]domain.CandidateScore, error) {
	return s.repo.GetCandidateScores()
}
