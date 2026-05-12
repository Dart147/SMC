package handler

import (
	"net/http"

	"github.com/Dart147/SMC/backend/internal/service"
)

type ProblemHandler struct {
	svc *service.ProblemService
}

func NewProblemHandler(svc *service.ProblemService) *ProblemHandler {
	return &ProblemHandler{svc: svc}
}

func (h *ProblemHandler) List(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.svc.List())
}

func (h *ProblemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	problem, ok := h.svc.GetByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "problem not found")
		return
	}
	writeJSON(w, http.StatusOK, problem)
}
