package service

import (
	"errors"
	"testing"
	"time"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type mockReportRepo struct {
	scores []domain.CandidateScore
	err    error
}

func (m *mockReportRepo) GetCandidateScores() ([]domain.CandidateScore, error) {
	return m.scores, m.err
}

func TestReportService_GetCandidateScores_Success(t *testing.T) {
	now := time.Now()
	expected := []domain.CandidateScore{
		{UserID: "u1", Username: "alice", ExamStartedAt: &now, TotalScore: 90},
		{UserID: "u2", Username: "bob", TotalScore: 70},
	}
	svc := NewReportService(&mockReportRepo{scores: expected})
	scores, err := svc.GetCandidateScores()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(scores) != 2 {
		t.Errorf("got %d scores, want 2", len(scores))
	}
	if scores[0].Username != "alice" {
		t.Errorf("first score username: got %q, want 'alice'", scores[0].Username)
	}
}

func TestReportService_GetCandidateScores_Empty(t *testing.T) {
	svc := NewReportService(&mockReportRepo{scores: []domain.CandidateScore{}})
	scores, err := svc.GetCandidateScores()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(scores) != 0 {
		t.Errorf("expected empty, got %d", len(scores))
	}
}

func TestReportService_GetCandidateScores_Error(t *testing.T) {
	svc := NewReportService(&mockReportRepo{err: errors.New("db error")})
	_, err := svc.GetCandidateScores()
	if err == nil {
		t.Fatal("expected error")
	}
}
