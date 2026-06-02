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
	db      *sql.DB
}

func NewSubmissionRepo(db *sql.DB) *SubmissionRepo {
	return &SubmissionRepo{
		queries: sqlcdb.New(db),
		db:      db,
	}
}

// 🌟 融合版 Update：使用 Max 的原生 SQL 來支援 score 更新，並加上你的 Error 處理
func (r *SubmissionRepo) Update(s domain.Submission) error {
	query := `
        UPDATE submissions 
        SET status = $1, 
            passed_test_cases = $2, 
            output = $3, 
            expected_output = $4, 
            error = $5,
            score = $6
        WHERE id = $7`

	_, err := r.db.Exec(query,
		s.Status,
		s.PassedTestCases,
		s.Output,
		s.ExpectedOutput,
		s.Error,
		s.Score, // Max 加的分數欄位
		s.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update submission in postgres: %w", err)
	}
	return nil
}

// 🌟 融合版 Save：寫入包含你加的 UserID
func (r *SubmissionRepo) Save(s domain.Submission) error {
	ctx := context.Background()
	err := r.queries.CreateSubmission(ctx, sqlcdb.CreateSubmissionParams{
		ID:              s.ID,
		ProblemID:       sql.NullString{String: s.ProblemID, Valid: s.ProblemID != ""},
		UserID:          sql.NullString{String: s.UserID, Valid: s.UserID != ""},
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

// 🌟 融合版 GetByID：使用你詳細的欄位 Mapping
func (r *SubmissionRepo) GetByID(id string) (domain.Submission, bool) {
	ctx := context.Background()
	row, err := r.queries.GetSubmissionByID(ctx, id)

	if err != nil {
		return domain.Submission{}, false
	}

	return domain.Submission{
		ID:              row.ID,
		ProblemID:       row.ProblemID.String,
		UserID:          row.UserID.String,
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

// 🌟 融合版 List：保留你的詳細資料 Mapping 與日誌
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
			UserID:          row.UserID.String,
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

// 🌟 融合版 GetLatestByProblem：保留你的詳細資料 Mapping
func (r *SubmissionRepo) GetLatestByProblem(problemID string) (domain.Submission, bool) {
	ctx := context.Background()
	row, err := r.queries.GetLatestSubmissionByProblem(ctx, sql.NullString{String: problemID, Valid: problemID != ""})
	if err != nil {
		return domain.Submission{}, false
	}
	return domain.Submission{
		ID:              row.ID,
		ProblemID:       row.ProblemID.String,
		UserID:          row.UserID.String,
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

// 🌟 Max 的新功能：Queue 拿取任務
func (r *SubmissionRepo) ClaimNext(ctx context.Context) (*domain.Submission, error) {
	row, err := r.queries.ClaimNextPendingSubmission(ctx)
	if err != nil {
		return nil, nil
	}
	return &domain.Submission{
		ID:        row.ID,
		ProblemID: row.ProblemID.String,
		Code:      row.Code,
		Language:  row.Language,
		Status:    row.Status.String,
	}, nil
}

// 🌟 Max 的新功能：Queue 卡死恢復
func (r *SubmissionRepo) RecoverStalled(ctx context.Context) error {
	return r.queries.RecoverStalledSubmissions(ctx)
}

// 🌟 融合版 ListByUserID：保留你的詳細資料 Mapping
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
			UserID:          userID,
			Language:        row.Language,
			Status:          row.Status.String,
			PassedTestCases: int(row.PassedTestCases.Int32),
			TotalTestCases:  int(row.TotalTestCases.Int32),
		})
	}
	if submissions == nil {
		return []domain.Submission{}
	}
	return submissions
}

// 🌟 Max 的新功能：取得完整報告
func (r *SubmissionRepo) GetReport(ctx context.Context, id string) (sqlcdb.GetSubmissionReportRow, error) {
	return r.queries.GetSubmissionReport(ctx, id)
}
