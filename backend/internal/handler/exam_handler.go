package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Dart147/SMC/backend/internal/middleware"
	"github.com/Dart147/SMC/backend/internal/service"
)

// ExamHandler 負責處理考試相關的 HTTP 請求
type ExamHandler struct {
	svc *service.ExamService
}

// NewExamHandler 建立新的 ExamHandler 實例
func NewExamHandler(svc *service.ExamService) *ExamHandler {
	return &ExamHandler{svc: svc}
}

// StartExam 正式啟動考試 (POST /api/exams/start)
func (h *ExamHandler) StartExam(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// 從 JWT Middleware 取得當前考生的 ID
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 呼叫 Service
	expiresAt, err := h.svc.StartExam(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":         "考試已正式開始",
		"exam_expires_at": expiresAt,
	})
}

// ReportWarning 🌟 核心修正：接收違規紀錄 (POST /api/exams/warn)
func (h *ExamHandler) ReportWarning(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 呼叫 Service 增加違規次數
	warningCount, err := h.svc.ReportWarning(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 將最新的違規次數回傳給前端
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "違規事件已記錄",
		"warning_count": warningCount,
	})
}

// EndExam 結束考試 (POST /api/exams/end)
func (h *ExamHandler) EndExam(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	endedAt, err := h.svc.EndExam(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "考試已結束",
		"exam_ended_at": endedAt,
	})
}