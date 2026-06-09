package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/middleware"
)

type ProblemServicer interface {
	Create(prob *domain.Problem) error
	List() []domain.Problem
	GetByID(id string) (domain.Problem, bool)
	Delete(id string) error
	Update(id string, prob *domain.Problem) error
	ListAssigned(userID string) []domain.Problem
	AssignProblem(userID, problemID string) error
	UnassignProblem(userID, problemID string) error
	GetAssignedProblemIDs(userID string) []string
}

type ProblemHandler struct{ svc ProblemServicer }

func NewProblemHandler(svc ProblemServicer) *ProblemHandler { return &ProblemHandler{svc: svc} }

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
	all := h.svc.List()
	display := make([]domain.Problem, len(all))
	for i, p := range all {
		display[i] = p.ForDisplay()
	}
	_ = json.NewEncoder(w).Encode(display)
}

func (h *ProblemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	p, ok := h.svc.GetByID(r.PathValue("id"))
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	_ = json.NewEncoder(w).Encode(p.ForDisplay())
}

func (h *ProblemHandler) Delete(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}
	if err := h.svc.Delete(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}

func (h *ProblemHandler) Update(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}
	var req struct {
		Title       string `json:"title"`
		Difficulty  string `json:"difficulty"`
		Description string `json:"description"`
		TestCases   []struct {
			Input          string `json:"input"`
			ExpectedOutput string `json:"expected_output"`
			IsHidden       bool   `json:"isHidden"`
		} `json:"testCases"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	prob := domain.Problem{Title: req.Title, Difficulty: req.Difficulty, Description: req.Description}
	for _, tc := range req.TestCases {
		prob.TestCases = append(prob.TestCases, domain.TestCase{
			Input: tc.Input, ExpectedOutput: tc.ExpectedOutput, IsHidden: tc.IsHidden,
		})
	}
	if err := h.svc.Update(id, &prob); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "updated"})
}

// GetByIDAdmin returns the full problem including hidden test cases (admin only).
func (h *ProblemHandler) GetByIDAdmin(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	p, ok := h.svc.GetByID(r.PathValue("id"))
	if !ok {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	type adminTC struct {
		Input          string `json:"input"`
		ExpectedOutput string `json:"expected_output"`
		IsHidden       bool   `json:"isHidden"`
	}
	type adminProb struct {
		ID          int       `json:"id"`
		Title       string    `json:"title"`
		Difficulty  string    `json:"difficulty"`
		Description string    `json:"description"`
		TestCases   []adminTC `json:"testCases"`
	}
	tcs := make([]adminTC, len(p.TestCases))
	for i, tc := range p.TestCases {
		tcs[i] = adminTC{Input: tc.Input, ExpectedOutput: tc.ExpectedOutput, IsHidden: tc.IsHidden}
	}
	_ = json.NewEncoder(w).Encode(adminProb{
		ID: p.ID, Title: p.Title, Difficulty: p.Difficulty,
		Description: p.Description, TestCases: tcs,
	})
}

// ListMyProblems 考生專用：只回傳被指派給自己的題目 (需要 JWT Auth)
func (h *ProblemHandler) ListMyProblems(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	problems := h.svc.ListAssigned(userID)
	_ = json.NewEncoder(w).Encode(problems)
}

// AssignProblem 面試官指派題目給考生 (POST /api/admin/assign-problem)
func (h *ProblemHandler) AssignProblem(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	var req struct {
		UserID    string `json:"userId"`
		ProblemID string `json:"problemId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" || req.ProblemID == "" {
		http.Error(w, "userId 和 problemId 為必填", http.StatusBadRequest)
		return
	}
	if err := h.svc.AssignProblem(req.UserID, req.ProblemID); err != nil {
		http.Error(w, "指派失敗", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "指派成功"})
}

// UnassignProblem 面試官取消題目指派 (DELETE /api/admin/assign-problem)
func (h *ProblemHandler) UnassignProblem(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	var req struct {
		UserID    string `json:"userId"`
		ProblemID string `json:"problemId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" || req.ProblemID == "" {
		http.Error(w, "userId 和 problemId 為必填", http.StatusBadRequest)
		return
	}
	if err := h.svc.UnassignProblem(req.UserID, req.ProblemID); err != nil {
		http.Error(w, "取消指派失敗", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "已取消指派"})
}

// GetCandidateAssignments 查詢某考生被指派的題目 ID 清單 (GET /api/admin/candidate-assignments?userId=xxx)
func (h *ProblemHandler) GetCandidateAssignments(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId 為必填", http.StatusBadRequest)
		return
	}
	ids := h.svc.GetAssignedProblemIDs(userID)
	_ = json.NewEncoder(w).Encode(ids)
}

func setHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}
