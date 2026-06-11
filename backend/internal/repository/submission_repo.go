package repository

import (
	"context"
	"database/sql"
	"fmt"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
	"go.uber.org/zap"
)

type SubmissionRepo struct {
	queries *sqlcdb.Queries
	db      *sql.DB
	logger  *zap.Logger
}

func NewSubmissionRepo(db *sql.DB, logger *zap.Logger) *SubmissionRepo {
	return &SubmissionRepo{
		queries: sqlcdb.New(db),
		db:      db,
		logger:  logger,
	}
}

func (r *SubmissionRepo) Update(s domain.Submission) error {
	query := `
        UPDATE submissions
        SET status = $1,
            passed_test_cases = $2,
            output = $3,
            expected_output = $4,
            error = $5,
            score = $6,
            execution_time_ms = $7
        WHERE id = $8`

	_, err := r.db.Exec(query,
		s.Status,
		s.PassedTestCases,
		s.Output,
		s.ExpectedOutput,
		s.Error,
		s.Score,
		s.ExecutionTimeMs,
		s.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update submission in postgres: %w", err)
	}
	return nil
}

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
		ExecutionTimeMs: int(row.ExecutionTimeMs),
		Output:          row.Output,
		ExpectedOutput:  row.ExpectedOutput,
		Error:           row.Error,
	}, true
}

func (r *SubmissionRepo) List() []domain.Submission {
	ctx := context.Background()
	rows, err := r.queries.ListSubmissions(ctx)
	if err != nil {
		r.logger.Error("failed to list submissions", zap.Error(err))
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
			ExecutionTimeMs: int(row.ExecutionTimeMs),
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
		ExecutionTimeMs: int(row.ExecutionTimeMs),
		Output:          row.Output,
		ExpectedOutput:  row.ExpectedOutput,
		Error:           row.Error,
	}, true
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
		Status:    row.Status.String,
	}, nil
}

func (r *SubmissionRepo) RecoverStalled(ctx context.Context) error {
	return r.queries.RecoverStalledSubmissions(ctx)
}

func (r *SubmissionRepo) ListByUserID(userID string) []domain.Submission {
	query := `
		SELECT s.id,
		       COALESCE(p.title, '') AS problem_title,
		       COALESCE(s.problem_id, '') AS problem_id,
		       s.language,
		       COALESCE(s.status, '') AS status,
		       COALESCE(s.passed_test_cases, 0) AS passed_test_cases,
		       COALESCE(s.total_test_cases, 0) AS total_test_cases,
		       COALESCE(s.score, 0) AS score,
		       COALESCE(s.execution_time_ms, 0) AS execution_time_ms,
		       COALESCE(s.output, '') AS output,
		       COALESCE(s.expected_output, '') AS expected_output,
		       COALESCE(s.error, '') AS error
		FROM submissions s
		LEFT JOIN problems p ON s.problem_id = p.id
		WHERE s.user_id = $1
		ORDER BY s.created_at DESC`

	rows, err := r.db.QueryContext(context.Background(), query, userID)
	if err != nil {
		r.logger.Error("failed to list submissions by user", zap.Error(err))
		return []domain.Submission{}
	}
	defer func() { _ = rows.Close() }()

	var submissions []domain.Submission
	for rows.Next() {
		var s domain.Submission
		s.UserID = userID
		if err := rows.Scan(
			&s.ID, &s.ProblemTitle, &s.ProblemID, &s.Language, &s.Status,
			&s.PassedTestCases, &s.TotalTestCases, &s.Score,
			&s.ExecutionTimeMs, &s.Output, &s.ExpectedOutput, &s.Error,
		); err != nil {
			r.logger.Error("failed to scan submission row", zap.Error(err))
			continue
		}
		submissions = append(submissions, s)
	}
	if submissions == nil {
		return []domain.Submission{}
	}
	return submissions
}

func (r *SubmissionRepo) GetReport(ctx context.Context, id string) (sqlcdb.GetSubmissionReportRow, error) {
	return r.queries.GetSubmissionReport(ctx, id)
}
