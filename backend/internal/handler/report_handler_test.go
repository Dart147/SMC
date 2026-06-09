package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type mockReportService struct {
	scores []domain.CandidateScore
	err    error
}

func (m *mockReportService) GetCandidateScores() ([]domain.CandidateScore, error) {
	return m.scores, m.err
}

func TestReportHandler_GetCandidateScores_OK(t *testing.T) {
	svc := &mockReportService{
		scores: []domain.CandidateScore{
			{UserID: "u1", Username: "alice", TotalScore: 80},
		},
	}
	h := NewReportHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/candidates/scores", nil)
	h.GetCandidateScores(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetCandidateScores OK: got %d, want 200", w.Code)
	}
}

func TestReportHandler_GetCandidateScores_Empty(t *testing.T) {
	svc := &mockReportService{scores: []domain.CandidateScore{}}
	h := NewReportHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/candidates/scores", nil)
	h.GetCandidateScores(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetCandidateScores empty: got %d, want 200", w.Code)
	}
}

func TestReportHandler_GetCandidateScores_ServiceError(t *testing.T) {
	svc := &mockReportService{err: errors.New("db error")}
	h := NewReportHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/candidates/scores", nil)
	h.GetCandidateScores(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("GetCandidateScores error: got %d, want 500", w.Code)
	}
}
