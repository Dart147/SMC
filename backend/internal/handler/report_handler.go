package handler

import (
	"net/http"

	"github.com/Dart147/SMC/backend/internal/service"
)

type ReportHandler struct {
	svc *service.ReportService
}

func NewReportHandler(svc *service.ReportService) *ReportHandler {
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
