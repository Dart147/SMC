package repository

import (
	"context"
	"database/sql"
	"fmt"
	
	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
)

type SubmissionRepo struct {
	queries *sqlcdb.Queries
}

// ⚠️ 確保建構函式有接收並注入 *sql.DB
func NewSubmissionRepo(db *sql.DB) *SubmissionRepo {
	return &SubmissionRepo{queries: sqlcdb.New(db)}
}

// 1. 當前端發送 POST 時，立刻寫入一筆真實的 Pending 資料到 PostgreSQL
func (r *SubmissionRepo) Save(s domain.Submission) error {
	ctx := context.Background()
	err := r.queries.CreateSubmission(ctx, sqlcdb.CreateSubmissionParams{
		ID:              s.ID,
		ProblemID:       sql.NullString{String: s.ProblemID, Valid: s.ProblemID != ""},
		Code:            s.Code,
		Language:        s.Language,
		Status:          sql.NullString{String: s.Status, Valid: s.Status != ""},
		PassedTestCases: sql.NullInt32{Int32: int32(s.PassedTestCases), Valid: true},
		TotalTestCases:  sql.NullInt32{Int32: int32(s.TotalTestCases), Valid: true},
	})
	if err != nil {
		return fmt.Errorf("failed to save submission to postgres: %w", err)
	}
	return nil
}

// 2. 當前端 Polling 輪詢發送 GET 時，從 PostgreSQL 撈出最新狀態
func (r *SubmissionRepo) GetByID(id string) (domain.Submission, bool) {
	ctx := context.Background()
	row, err := r.queries.GetSubmissionByID(ctx, id)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.Submission{}, false
		}
		return domain.Submission{}, false 
	}
	
	return domain.Submission{
		ID:              row.ID,
		ProblemID:       row.ProblemID.String,
		Code:            row.Code,
		Language:        row.Language,
		Status:          row.Status.String,
		PassedTestCases: int(row.PassedTestCases.Int32),
		TotalTestCases:  int(row.TotalTestCases.Int32),
		Output:          row.Output,
		ExpectedOutput:  row.ExpectedOutput,
		Error:           row.Error,
	}, true
}

// 3. 當背景 Sandbox 評測完畢，將最終結果更新回 PostgreSQL
func (r *SubmissionRepo) Update(s domain.Submission) error {
	ctx := context.Background()
	
	_, err := r.queries.UpdateSubmission(ctx, sqlcdb.UpdateSubmissionParams{
		Status:          sql.NullString{String: s.Status, Valid: s.Status != ""},
		PassedTestCases: sql.NullInt32{Int32: int32(s.PassedTestCases), Valid: true},
		Output:          sql.NullString{String: s.Output, Valid: s.Output != ""},
		ExpectedOutput:  sql.NullString{String: s.ExpectedOutput, Valid: s.ExpectedOutput != ""},
		Error:           sql.NullString{String: s.Error, Valid: s.Error != ""},
		ID:              s.ID,
	})
	
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("submission %q not found", s.ID)
		}
		return fmt.Errorf("failed to update submission in postgres: %w", err)
	}

	return nil
}

// 4. 獲取所有提交紀錄 (供前端歷史列表顯示)
func (r *SubmissionRepo) List() []domain.Submission {
	ctx := context.Background()
	rows, err := r.queries.ListSubmissions(ctx)
	if err != nil {
		fmt.Printf("failed to query submissions: %v\n", err)
		return []domain.Submission{} // 發生錯誤時回傳空陣列，避免前端炸掉
	}
	defer func() {
		if err := rows.Close(); err != nil {
			fmt.Printf("failed to close submission rows: %v\n", err)
		}
	}()

	var submissions []domain.Submission
	for _, row := range rows {
		submissions = append(submissions, domain.Submission{
			ID:              row.ID,
			ProblemID:       row.ProblemID.String,
			Code:            row.Code,
			Language:        row.Language,
			Status:          row.Status.String,
			PassedTestCases: int(row.PassedTestCases.Int32),
			TotalTestCases:  int(row.TotalTestCases.Int32),
			Output:          row.Output,
			ExpectedOutput:  row.ExpectedOutput,
			Error:           row.Error,
		})
	}

	if submissions == nil {
		return []domain.Submission{}
	}

	return submissions
}
