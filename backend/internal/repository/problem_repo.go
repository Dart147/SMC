package repository

import (
	"context"
	"database/sql"
	"fmt"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
)

type ProblemRepo struct {
	queries *sqlcdb.Queries
}

// 💡 調整建構函式，改為使用 sqlc 生成的 queries
func NewProblemRepo(db *sql.DB) *ProblemRepo {
	return &ProblemRepo{queries: sqlcdb.New(db)}
}

// List 獲取所有題目列表 (從資料庫撈取)
func (r *ProblemRepo) List() []domain.Problem {
	ctx := context.Background()
	rows, err := r.queries.ListProblems(ctx)
	if err != nil {
		fmt.Printf("failed to list problems: %v\n", err)
		return []domain.Problem{}
	}

	var problems []domain.Problem
	for _, row := range rows {
		problems = append(problems, domain.Problem{
			ID:          row.ID,
			Title:       row.Title,
			Difficulty:  row.Difficulty.String,
			Description: row.Description,
		})
	}

	if problems == nil {
		return []domain.Problem{}
	}
	return problems
}

// GetByID 根據 ID 獲取單一題目詳細內容
func (r *ProblemRepo) GetByID(id string) (domain.Problem, bool) {
	ctx := context.Background()
	row, err := r.queries.GetProblemByID(ctx, id)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.Problem{}, false
		}
		fmt.Printf("failed to query problem by id %q: %v\n", id, err)
		return domain.Problem{}, false
	}

	return domain.Problem{
		ID:          row.ID,
		Title:       row.Title,
		Difficulty:  row.Difficulty.String,
		Description: row.Description,
	}, true
}