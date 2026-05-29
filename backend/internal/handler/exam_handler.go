package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Dart147/SMC/backend/internal/service"
)

// POST /api/exams/startpackage repository

import (
	"context"
	"database/sql"
	"time"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
)

type ExamHandler struct {
	svc *service.ExamService
}

func NewExamHandler(svc *service.ExamService) *ExamHandler {
	return &ExamHandler{svc: svc}
}

type ExamRepo struct {
	db      *sql.DB
	queries *sqlcdb.Queries
}

// 實例化 ExamRepo
func NewExamRepo(db *sql.DB) *ExamRepo {
	return &ExamRepo{
		db:      db,
		queries: sqlcdb.New(db),
	}
}

// StartExam 正式啟動考試並回傳開始時間
func (r *ExamRepo) StartExam(userID string) (time.Time, error) {
	ctx := context.Background()

	// 呼叫 sqlc 產生的 StartExam
	// (注意：如果你的 DB 中 users.id 是整數，請在這裡將 userID string 轉為 int/int32)
	startedAtNull, err := r.queries.StartExam(ctx, userID)
	if err != nil {
		return time.Time{}, err
	}

	// sqlc 如果遇到 nullable 的時間欄位，會回傳 sql.NullTime
	// 我們在這裡把它轉回乾淨的 time.Time
	if startedAtNull.Valid {
		return startedAtNull.Time, nil
	}

	// 備用防呆：如果拿不到時間就給當下時間
	return time.Now(), nil
}

// IncrementWarning 增加違規次數，並回傳最新的次數
func (r *ExamRepo) IncrementWarning(userID string) (int, error) {
	ctx := context.Background()

	// 呼叫 sqlc 產生的 IncrementWarning
	warningCount, err := r.queries.IncrementWarning(ctx, userID)
	if err != nil {
		return 0, err
	}

	return int(warningCount), nil
}
func (h *ExamHandler) StartExam(w http.ResponseWriter, r *http.Request) {
	// 這裡先設定回傳格式與 CORS (你可以共用之前寫好的 setHeaders)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// 🌟 從 JWT Middleware 取得當前考生的 ID
	// (這裡請依照你們專案實際在 middleware 解析 JWT 的 key 來取值)
	userID, ok := r.Context().Value("userID").(string)
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

	// 回傳過期時間戳記給前端的 Zustand Store
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":         "考試已正式開始",
		"exam_expires_at": expiresAt,
	})
}

// POST /api/exams/warn
func (h *ExamHandler) ReportWarning(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	userID, ok := r.Context().Value("userID").(string)
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

	// 將最新的違規次數回傳給前端判斷是否要強制交卷
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "違規事件已記錄",
		"warning_count": warningCount,
	})
}

// POST /api/exams/end
func (h *ExamHandler) EndExam(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	userID, ok := r.Context().Value("userID").(string)
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "考試已結束",
		"exam_ended_at": endedAt,
	})
}
