package repository

import (
	"context"
	"database/sql"
	"time"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
)

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

// EndExam 記錄考試結束時間
func (r *ExamRepo) EndExam(userID string) (time.Time, error) {
	ctx := context.Background()
	endedAtNull, err := r.queries.EndExam(ctx, userID)
	if err != nil {
		return time.Time{}, err
	}
	if endedAtNull.Valid {
		return endedAtNull.Time, nil
	}
	return time.Now(), nil
}
