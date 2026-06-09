package handler

import (
	"net/http"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type ReportServicer interface {
	GetCandidateScores() ([]domain.CandidateScore, error)
}

type ReportHandler struct {
	svc ReportServicer
}

func NewReportHandler(svc ReportServicer) *ReportHandler {
	return &ReportHandler{svc: svc}
}

// GET /api/admin/candidates/scores
func (h *ReportHandler) GetCandidateScores(w http.ResponseWriter, r *http.Request) {
	scores, err := h.svc.GetCandidateScores()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get candidate scores")
		return
	}
	writeJSON(w, http.StatusOK, scores)
}
