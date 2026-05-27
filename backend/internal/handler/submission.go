package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Dart147/SMC/backend/internal/domain"
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

func (h *SubmissionHandler) List(w http.ResponseWriter, r *http.Request) {
	submissions := h.svc.List()

	// 如果回傳是 nil，確保給前端一個空的 JSON 陣列 []，而不是 null
	if submissions == nil {
		submissions = []domain.Submission{}
	}

	writeJSON(w, http.StatusOK, submissions)
}

// 獲取該題目的最新提交 (URL 範例: /api/submissions/latest?problemId=1)
func (h *SubmissionHandler) GetLatest(w http.ResponseWriter, r *http.Request) {
	// 從 Query String 抓取 problemId
	problemID := r.URL.Query().Get("problemId")
	if problemID == "" {
		writeError(w, http.StatusBadRequest, "problemId is required in query parameters")
		return
	}

	sub, ok := h.svc.GetLatestByProblem(problemID)
	if !ok {
		// 回傳 404，這樣前端的 try-catch 就會捕捉到並乖乖退回「預設模板」
		writeError(w, http.StatusNotFound, "no submission found for this problem")
		return
	}

	writeJSON(w, http.StatusOK, sub)
}

// GET /api/admin/submissions?userId=xxx — 管理台查詢特定考生的提交紀錄
func (h *SubmissionHandler) ListByUserID(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "userId is required in query parameters")
		return
	}
	submissions := h.svc.ListByUserID(userID)
	if submissions == nil {
		submissions = []domain.Submission{}
	}
	writeJSON(w, http.StatusOK, submissions)
}
