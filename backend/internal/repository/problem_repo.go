package repository

import (
	"database/sql"
	"fmt"
	"math/rand"
	"strings"
	"time"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
)

type ProblemRepo struct {
	db      *sql.DB
	queries *sqlcdb.Queries
}

func NewProblemRepo(db *sql.DB) *ProblemRepo {
	return &ProblemRepo{
		db:      db,
		queries: sqlcdb.New(db),
	}
}

func (r *ProblemRepo) Create(prob *domain.Problem) error {
	// ⚡️ 核心修正：資料庫不給 ID，我們自己生一個隨機 6 位數
	rand.Seed(time.Now().UnixNano())
	newProblemID := rand.Intn(899999) + 100000

	// 1. 插入題目 (強行指定 ID)
	queryProblem := `INSERT INTO problems (id, title, difficulty, description) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(queryProblem, newProblemID, prob.Title, prob.Difficulty, prob.Description)
	if err != nil {
		fmt.Printf("❌ 題目儲存失敗: %v\n", err)
		return err
	}

	// 2. 插入測資
	for _, tc := range prob.TestCases {
		// 測資的 ID 也自己生一個 8 位數
		newTCID := rand.Intn(89999999) + 10000000
		queryTC := `INSERT INTO test_cases (id, problem_id, input, expected_output) VALUES ($1, $2, $3, $4)`
		_, err = r.db.Exec(queryTC, newTCID, newProblemID, tc.Input, tc.ExpectedOutput)
		if err != nil {
			fmt.Printf("❌ 測資儲存失敗: %v\n", err)
			return err
		}
	}

	prob.ID = newProblemID
	return nil
}

func (r *ProblemRepo) List() []domain.Problem {
	rows, err := r.db.Query(`SELECT id, title, difficulty, description FROM problems ORDER BY id DESC`)
	if err != nil {
		return []domain.Problem{}
	}
	defer rows.Close()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		var diff sql.NullString
		if err := rows.Scan(&p.ID, &p.Title, &diff, &p.Description); err != nil {
			continue
		}
		p.Difficulty = diff.String
		p.TestCases = r.getTestCasesByProblemID(p.ID)
		problems = append(problems, p)
	}
	return problems
}

func (r *ProblemRepo) GetByID(id string) (domain.Problem, bool) {
	var p domain.Problem
	var diff sql.NullString
	err := r.db.QueryRow(`SELECT id, title, difficulty, description FROM problems WHERE id = $1`, id).
		Scan(&p.ID, &p.Title, &diff, &p.Description)
	if err != nil {
		return domain.Problem{}, false
	}
	p.Difficulty = diff.String
	p.TestCases = r.getTestCasesByProblemID(p.ID)
	return p, true
}

func (r *ProblemRepo) getTestCasesByProblemID(pID int) []domain.TestCase {
	query := `SELECT input, expected_output FROM test_cases WHERE problem_id = $1`
	rows, err := r.db.Query(query, pID)
	if err != nil {
		return []domain.TestCase{}
	}
	defer rows.Close()

	var tcs []domain.TestCase
	for rows.Next() {
		var tc domain.TestCase
		if err := rows.Scan(&tc.Input, &tc.ExpectedOutput); err == nil {
			tc.Input = strings.ReplaceAll(tc.Input, `\n`, "\n")
			tc.ExpectedOutput = strings.ReplaceAll(tc.ExpectedOutput, `\n`, "\n")
			tcs = append(tcs, tc)
		}
	}
	return tcs
}
