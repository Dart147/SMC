package repository

import (
	"database/sql"
	"fmt"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type ProblemRepo struct {
	db *sql.DB // 💡 改為注入真實的 sql.DB 物件
}

// 💡 調整建構函式，不再接收檔案路徑，而是接收資料庫連線
func NewProblemRepo(db *sql.DB) *ProblemRepo {
	return &ProblemRepo{db: db}
}

// List 獲取所有題目列表 (從資料庫撈取)
func (r *ProblemRepo) List() []domain.Problem {
	query := `SELECT id, title, difficulty, description FROM problems ORDER BY id ASC`
	rows, err := r.db.Query(query)
	if err != nil {
		fmt.Printf("failed to query problems from db: %v\n", err)
		return []domain.Problem{}
	}
	defer func() {
		if err := rows.Close(); err != nil {
			fmt.Printf("failed to close problem rows: %v\n", err)
		}
	}()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		// 這裡先不處理 test_cases，因為列表通常只需要題目基本資訊
		err := rows.Scan(&p.ID, &p.Title, &p.Difficulty, &p.Description)
		if err == nil {
			problems = append(problems, p)
		} else {
			fmt.Printf("failed to scan problem row: %v\n", err)
		}
	}

	if problems == nil {
		return []domain.Problem{}
	}
	return problems
}

// GetByID 根據 ID 獲取單一題目詳細內容
func (r *ProblemRepo) GetByID(id string) (domain.Problem, bool) {
	var p domain.Problem
	query := `SELECT id, title, difficulty, description FROM problems WHERE id = $1`

	err := r.db.QueryRow(query, id).Scan(&p.ID, &p.Title, &p.Difficulty, &p.Description)
	if err != nil {
		if err == sql.ErrNoRows {
			return p, false
		}
		fmt.Printf("failed to query problem by id %q: %v\n", id, err)
		return p, false
	}

	return p, true
}
