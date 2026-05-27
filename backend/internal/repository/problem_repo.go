package repository

import (
	"context"
	"database/sql"
	"fmt"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
)

type ProblemRepo struct {
	db      *sql.DB // 為了支援 Transaction，我們現在需要把原本的 *sql.DB 存下來
	queries *sqlcdb.Queries
}

// 💡 調整建構函式，改為使用 sqlc 生成的 queries，並保留 db
func NewProblemRepo(db *sql.DB) *ProblemRepo {
	return &ProblemRepo{
		db:      db,
		queries: sqlcdb.New(db),
	}
}

// CreateProblem 建立新題目，並利用 DB Transaction 同步寫入對應的測試資料
func (r *ProblemRepo) CreateProblem(ctx context.Context, p domain.Problem) error {
	// 1. 開啟一個新的資料庫交易 (Transaction)
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	// 確保發生任何錯誤或 panic 時，一定能 rollback (避免資料卡在一半)
	defer func() {
		if err := tx.Rollback(); err != nil && err != sql.ErrTxDone {
			fmt.Printf("failed to rollback transaction: %v\n", err)
		}
	}()

	// 2. 利用 sqlc 的 WithTx 將本來的 queries 綁定到這個 Transaction 上
	qtx := r.queries.WithTx(tx)

	// 3. 寫入 Problem 主表
	err = qtx.CreateProblem(ctx, sqlcdb.CreateProblemParams{
		ID:            p.ID,
		Title:         p.Title,
		Description:   p.Description,
		TimeLimitMs:   5000,
		MemoryLimitKb: 262144, // 256MB
		Difficulty:    sql.NullString{String: p.Difficulty, Valid: p.Difficulty != ""},
	})
	if err != nil {
		return fmt.Errorf("failed to create problem %q: %w", p.ID, err)
	}

	// 4. 寫入所有的 TestCases (必須跟 Problem 在這個交易中一併完成)
	for i, tc := range p.TestCases {
		err = qtx.CreateTestCase(ctx, sqlcdb.CreateTestCaseParams{
			ID:             fmt.Sprintf("%s-tc-%d", p.ID, i+1), // 簡單產生測資的 ID
			ProblemID:      sql.NullString{String: p.ID, Valid: p.ID != ""},
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			IsHidden:       sql.NullBool{Bool: true, Valid: true}, // 這裡預設隱藏
		})
		if err != nil {
			return fmt.Errorf("failed to create test case %d for problem %q: %w", i, p.ID, err)
		}
	}

	// 5. 當前面所有步驟都沒出錯，我們才最後確認提交 Commit
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
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
