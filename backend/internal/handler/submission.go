package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Dart147/SMC/backend/internal/service"
)

type SubmissionHandler struct {
	svc *service.SubmissionService
}

func NewSubmissionHandler(svc *service.SubmissionService) *SubmissionHandler {
	return &SubmissionHandler{svc: svc}
}

type createSubmissionRequest struct {
	ProblemID string `json:"problemId"`
	Code      string `json:"code"`
	Language  string `json:"language"`
}

func (h *SubmissionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.ProblemID == "" || req.Code == "" || req.Language == "" {
		writeError(w, http.StatusBadRequest, "problemId, code, and language are required")
		return
	}

	sub, err := h.svc.Create(req.ProblemID, req.Code, req.Language)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create submission")
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (h *SubmissionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sub, ok := h.svc.GetByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "submission not found")
		return
	}
	writeJSON(w, http.StatusOK, sub)
}
