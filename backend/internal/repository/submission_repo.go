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

func NewSubmissionRepo(db *sql.DB) *SubmissionRepo {
	return &SubmissionRepo{queries: sqlcdb.New(db)}
}

// 1. 寫入一筆真實的 Pending 資料到 PostgreSQL
func (r *SubmissionRepo) Save(s domain.Submission) error {
	ctx := context.Background()
	err := r.queries.CreateSubmission(ctx, sqlcdb.CreateSubmissionParams{
		ID:              s.ID,
		ProblemID:       sql.NullString{String: s.ProblemID, Valid: s.ProblemID != ""},
		UserID:          sql.NullString{String: s.UserID, Valid: s.UserID != ""}, // 🌟 新增：寫入 UserID
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

// 2. 從 PostgreSQL 撈出最新狀態
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
		UserID:          row.UserID.String, // 🌟 新增：讀取 UserID
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

// 3. 將最終結果更新回 PostgreSQL (Update 通常不會改動 UserID，保持原樣)
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

// 4. 獲取所有提交紀錄
func (r *SubmissionRepo) List() []domain.Submission {
	ctx := context.Background()
	rows, err := r.queries.ListSubmissions(ctx)
	if err != nil {
		fmt.Printf("failed to query submissions: %v\n", err)
		return []domain.Submission{}
	}
	var submissions []domain.Submission
	for _, row := range rows {
		submissions = append(submissions, domain.Submission{
			ID:              row.ID,
			ProblemID:       row.ProblemID.String,
			UserID:          row.UserID.String, // 🌟 新增：讀取 UserID
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

// 5. 獲取特定題目的最新一次提交紀錄
func (r *SubmissionRepo) GetLatestByProblem(problemID string) (domain.Submission, bool) {
	ctx := context.Background()

	row, err := r.queries.GetLatestSubmissionByProblem(ctx, sql.NullString{String: problemID, Valid: problemID != ""})

	if err != nil {
		if err == sql.ErrNoRows {
			return domain.Submission{}, false
		}
		return domain.Submission{}, false
	}

	return domain.Submission{
		ID:              row.ID,
		ProblemID:       row.ProblemID.String,
		UserID:          row.UserID.String, // 🌟 新增：讀取 UserID
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

// 6. 獲取特定用戶的所有提交紀錄
func (r *SubmissionRepo) ListByUserID(userID string) []domain.Submission {
	ctx := context.Background()
	rows, err := r.queries.ListSubmissionsByUserID(ctx, sql.NullString{String: userID, Valid: userID != ""})
	if err != nil {
		fmt.Printf("failed to query submissions by user: %v\n", err)
		return []domain.Submission{}
	}
	var submissions []domain.Submission
	for _, row := range rows {
		submissions = append(submissions, domain.Submission{
			ID:              row.ID,
			ProblemID:       row.ProblemID.String,
			UserID:          userID, // 🌟 新增：因為已經是找特定 User，可以直接塞進去
			Language:        row.Language,
			Status:          row.Status.String,
			PassedTestCases: int(row.PassedTestCases.Int32),
			TotalTestCases:  int(row.TotalTestCases.Int32),
            // 注意：如果在 query.sql 裡面 ListSubmissionsByUserID 也有查出 Code, Output, Error 等欄位，請一併在這裡補上
		})
	}
	if submissions == nil {
		return []domain.Submission{}
	}
	return submissions
}