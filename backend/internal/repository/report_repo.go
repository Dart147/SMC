package repository

import (
	"context"
	"database/sql"
	"time"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
)

type ReportRepo struct {
	queries *sqlcdb.Queries
}

func NewReportRepo(db *sql.DB) *ReportRepo {
	return &ReportRepo{queries: sqlcdb.New(db)}
}

// GetCandidateScores 回傳所有考生的得分彙總，依總分降序排列
func (r *ReportRepo) GetCandidateScores() ([]domain.CandidateScore, error) {
	ctx := context.Background()
	rows, err := r.queries.GetCandidateScores(ctx)
	if err != nil {
		return nil, err
	}

	var scores []domain.CandidateScore
	for _, row := range rows {
		var examStartedAt *time.Time
		if row.ExamStartedAt.Valid {
			t := row.ExamStartedAt.Time
			examStartedAt = &t
		}
		scores = append(scores, domain.CandidateScore{
			UserID:            row.UserID,
			Username:          row.Username,
			ExamStartedAt:     examStartedAt,
			TotalScore:        int(row.TotalScore),
			ProblemsAttempted: int(row.ProblemsAttempted),
			ProblemsAccepted:  int(row.ProblemsAccepted),
		})
	}
	if scores == nil {
		return []domain.CandidateScore{}, nil
	}
	return scores, nil
}
