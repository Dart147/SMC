package repository

import (
	"context"
	"database/sql"

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

// 🌟 修正後的 Update：刪掉不存在的 updated_at 欄位
func (r *SubmissionRepo) Update(s domain.Submission) error {
	query := `
        UPDATE submissions 
        SET status = $1, 
            passed_test_cases = $2, 
            output = $3, 
            expected_output = $4, 
            error = $5,
            score = $6
        WHERE id = $7` // 這裡拿掉了 updated_at = NOW()

	_, err := r.db.Exec(query,
		s.Status,
		s.PassedTestCases,
		s.Output,
		s.ExpectedOutput,
		s.Error,
		s.Score, // 分數
		s.ID,
	)
	return err
}

func (r *SubmissionRepo) Save(s domain.Submission) error {
	ctx := context.Background()
	return r.queries.CreateSubmission(ctx, sqlcdb.CreateSubmissionParams{
		ID:              s.ID,
		ProblemID:       sql.NullString{String: s.ProblemID, Valid: s.ProblemID != ""},
		UserID:          sql.NullString{String: s.UserID, Valid: s.UserID != ""},
		Code:            s.Code,
		Language:        s.Language,
		Status:          sql.NullString{String: s.Status, Valid: s.Status != ""},
		PassedTestCases: sql.NullInt32{Int32: int32(s.PassedTestCases), Valid: true},
		TotalTestCases:  sql.NullInt32{Int32: int32(s.TotalTestCases), Valid: true},
	})
}

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

func (r *SubmissionRepo) List() []domain.Submission {
	ctx := context.Background()
	rows, _ := r.queries.ListSubmissions(ctx)
	var submissions []domain.Submission
	for _, row := range rows {
		submissions = append(submissions, domain.Submission{
			ID:              row.ID,
			ProblemID:       row.ProblemID.String,
			UserID:          row.UserID.String,
			Status:          row.Status.String,
			PassedTestCases: int(row.PassedTestCases.Int32),
		})
	}
	return submissions
}

func (r *SubmissionRepo) GetLatestByProblem(problemID string) (domain.Submission, bool) {
	ctx := context.Background()
	row, err := r.queries.GetLatestSubmissionByProblem(ctx, sql.NullString{String: problemID, Valid: true})
	if err != nil {
		return domain.Submission{}, false
	}
	return domain.Submission{ID: row.ID, Status: row.Status.String}, true
}

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
	}, nil
}

func (r *SubmissionRepo) RecoverStalled(ctx context.Context) error {
	return r.queries.RecoverStalledSubmissions(ctx)
}

func (r *SubmissionRepo) ListByUserID(userID string) []domain.Submission {
	ctx := context.Background()
	rows, _ := r.queries.ListSubmissionsByUserID(ctx, sql.NullString{String: userID, Valid: true})
	var submissions []domain.Submission
	for _, row := range rows {
		submissions = append(submissions, domain.Submission{ID: row.ID, Status: row.Status.String})
	}
	return submissions
}

func (r *SubmissionRepo) GetReport(ctx context.Context, id string) (sqlcdb.GetSubmissionReportRow, error) {
	return r.queries.GetSubmissionReport(ctx, id)
}