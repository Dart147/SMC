package handler

import (
	"encoding/json"
	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/service"
	"net/http"
)

type ProblemHandler struct{ svc *service.ProblemService }

func NewProblemHandler(svc *service.ProblemService) *ProblemHandler { return &ProblemHandler{svc: svc} }

func (h *ProblemHandler) Create(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	var prob domain.Problem
	if err := json.NewDecoder(r.Body).Decode(&prob); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.Create(&prob); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "成功", "title": prob.Title})
}

func (h *ProblemHandler) List(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	_ = json.NewEncoder(w).Encode(h.svc.List())
}

func (h *ProblemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	p, ok := h.svc.GetByID(r.PathValue("id"))
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	_ = json.NewEncoder(w).Encode(p)
}

func setHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}
