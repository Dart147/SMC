package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/middleware"
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

type runSampleResponse struct {
	Status         string `json:"status"`
	Output         string `json:"output"`
	ExpectedOutput string `json:"expectedOutput"`
	Error          string `json:"error"`
}

// 1. POST /api/submissions - 建立新的程式碼提交
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

	// 🌟 從 Context 把當前登入者的 UserID 抓出來
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 把 userID 傳遞給 Service 層，確保寫入 DB 時有關聯
	sub, err := h.svc.Create(req.ProblemID, req.Code, req.Language, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create submission")
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

// 2. GET /api/submissions/{id} - 查詢單筆詳細評測結果 (前端輪詢用)
func (h *SubmissionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	// 🌟 安全防線：從 Context 取得當前登入者 ID
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	id := r.PathValue("id")
	sub, ok := h.svc.GetByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "submission not found")
		return
	}

	// 🌟 越權安全檢查 (Aledor Cross-User Data Access Prevention)
	// 確保一般考生絕對不能透過猜測 UUID/ID 去查看其他考生的程式碼與結果
	if sub.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden) // 403 拒絕存取
		return
	}

	writeJSON(w, http.StatusOK, sub)
}

// 3. GET /api/submissions - 獲取當前用戶的所有歷史提交紀錄
func (h *SubmissionHandler) List(w http.ResponseWriter, r *http.Request) {
	// 從 JWT Middleware 設定好的 Context 中取出 UserID
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 呼叫 Service 獲取該考生專屬的資料
	submissions := h.svc.ListByUserID(userID)

	// 如果回傳是 nil，確保給前端一個空的 JSON 陣列 []，而不是 null
	if submissions == nil {
		submissions = []domain.Submission{}
	}

	writeJSON(w, http.StatusOK, submissions)
}

// 4. GET /api/submissions/latest - 獲取特定題目的最新一次提交紀錄 (工作區草稿復原用)
func (h *SubmissionHandler) GetLatest(w http.ResponseWriter, r *http.Request) {
	// 🌟 安全防線：從 Context 取得當前登入者 ID
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

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

	// 🌟 越權安全檢查：避免多個考生寫同一題時，最新提交撈到別人的程式碼草稿
	if sub.UserID != userID {
		writeError(w, http.StatusNotFound, "no submission found for this problem")
		return
	}

	writeJSON(w, http.StatusOK, sub)
}

// 5. GET /api/admin/submissions - 管理台查詢特定考生的提交紀錄 (僅供後台使用)
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

// 6. POST /api/run - dry-run against the first sample test case; no DB write
func (h *SubmissionHandler) RunSample(w http.ResponseWriter, r *http.Request) {
	var req createSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.ProblemID == "" || req.Code == "" || req.Language == "" {
		writeError(w, http.StatusBadRequest, "problemId, code, and language are required")
		return
	}

	result, err := h.svc.RunSample(r.Context(), req.ProblemID, req.Code, req.Language)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, runSampleResponse{
		Status:         result.Status,
		Output:         result.Output,
		ExpectedOutput: result.ExpectedOutput,
		Error:          result.Error,
	})
}

// 7. GET /api/submissions/{id}/report - 面試官查看考生的詳細表現報告
func (h *SubmissionHandler) GetReport(w http.ResponseWriter, r *http.Request) {
	// 從網址拿到提交 ID
	id := r.PathValue("id")

	// 呼叫 Service 拿到完整報告 (包含 username, warning_count 等)
	// 這裡我們先假設 Service 層已經準備好 GetReportByID 了
	report, err := h.svc.GetReportByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "submission report not found")
		return
	}

	writeJSON(w, http.StatusOK, report)
}
