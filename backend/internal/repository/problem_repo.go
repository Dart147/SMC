package repository

import (
	"database/sql"
	"fmt"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type ProblemRepo struct {
	db *sql.DB
}

func NewProblemRepo(db *sql.DB) *ProblemRepo {
	return &ProblemRepo{db: db}
}

// Create 實作持久化功能：將題目與測資存入資料庫
func (r *ProblemRepo) Create(prob *domain.Problem) error {
	// 1. 開啟事務 (Transaction)
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}

	// 確保發生錯誤時會 Rollback，成功時會 Commit
	defer tx.Rollback()

	// 2. 插入題目基本資訊
	queryProblem := `
        INSERT INTO problems (title, difficulty, description) 
        VALUES ($1, $2, $3) 
        RETURNING id`
	
	err = tx.QueryRow(queryProblem, prob.Title, prob.Difficulty, prob.Description).Scan(&prob.ID)
	if err != nil {
		return fmt.Errorf("failed to insert problem: %v", err)
	}

	// 3. 插入該題目的所有測資
	queryTestCase := `
        INSERT INTO test_cases (problem_id, input, expected_output) 
        VALUES ($1, $2, $3)`
	
	for _, tc := range prob.TestCases {
		_, err = tx.Exec(queryTestCase, prob.ID, tc.Input, tc.ExpectedOutput)
		if err != nil {
			return fmt.Errorf("failed to insert test case: %v", err)
		}
	}

	// 4. 提交事務
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	return nil
}

// List 獲取所有題目列表 (包含關聯的測資)
func (r *ProblemRepo) List() []domain.Problem {
	query := `SELECT id, title, difficulty, description FROM problems ORDER BY id ASC`
	rows, err := r.db.Query(query)
	if err != nil {
		fmt.Printf("failed to query problems from db: %v\n", err)
		return []domain.Problem{}
	}
	defer rows.Close()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		err := rows.Scan(&p.ID, &p.Title, &p.Difficulty, &p.Description)
		if err != nil {
			continue
		}

		// 【核心修正】讀取每一題時，手動去抓取該題目的測資
		p.TestCases = r.getTestCasesByProblemID(p.ID)
		
		problems = append(problems, p)
	}
	return problems
}

// GetByID 根據 ID 獲取單一題目詳細內容 (包含測資)
func (r *ProblemRepo) GetByID(id string) (domain.Problem, bool) {
	var p domain.Problem
	query := `SELECT id, title, difficulty, description FROM problems WHERE id = $1`

	err := r.db.QueryRow(query, id).Scan(&p.ID, &p.Title, &p.Difficulty, &p.Description)
	if err != nil {
		return p, false
	}

	// 【核心修正】單一查詢也要補上測資
	p.TestCases = r.getTestCasesByProblemID(p.ID)
	
	return p, true
}

// getTestCasesByProblemID 是一個私有輔助函式，專門從 test_cases 表抓取對應資料
func (r *ProblemRepo) getTestCasesByProblemID(problemID int) []domain.TestCase {
	query := `SELECT input, expected_output FROM test_cases WHERE problem_id = $1`
	rows, err := r.db.Query(query, problemID)
	if err != nil {
		fmt.Printf("failed to query test cases for problem %d: %v\n", problemID, err)
		return []domain.TestCase{}
	}
	defer rows.Close()

	var testCases []domain.TestCase
	for rows.Next() {
		var tc domain.TestCase
		// 這裡 Scan 的順序必須對應 SQL query 的順序
		if err := rows.Scan(&tc.Input, &tc.ExpectedOutput); err == nil {
			testCases = append(testCases, tc)
		}
	}
	return testCases
}