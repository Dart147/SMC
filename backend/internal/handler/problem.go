package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/service"
)

type ProblemHandler struct {
	svc *service.ProblemService
}

func NewProblemHandler(svc *service.ProblemService) *ProblemHandler {
	return &ProblemHandler{svc: svc}
}

// Create: 處理 POST /api/problems (新增題目)
func (h *ProblemHandler) Create(w http.ResponseWriter, r *http.Request) {
	// 1. 先處理 Header 和 Options (CORS)
	setHeaders(w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 2. 只允許 POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var prob domain.Problem
	if err := json.NewDecoder(r.Body).Decode(&prob); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 3. 呼叫 Service 存入資料庫 (永久儲存的核心)
	if err := h.svc.Create(&prob); err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "題目建立成功",
		"title":   prob.Title,
	})
}

// List: 處理 GET /api/problems (列出題目)
func (h *ProblemHandler) List(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}
	problems := h.svc.List()
	json.NewEncoder(w).Encode(problems)
}

// GetByID: 處理 GET /api/problems/{id} (取得單題)
func (h *ProblemHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	setHeaders(w)
	if r.Method == "OPTIONS" {
		return
	}

	id := r.PathValue("id")
	problem, ok := h.svc.GetByID(id)
	if !ok {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(problem)
}

// 輔助函數：統一處理 Header 與跨域設定
func setHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	// 允許前端開發伺服器存取
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}
