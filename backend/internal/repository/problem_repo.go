package repository

import (
	"context"
	"database/sql"
	"fmt"
	"math/rand"
	"strconv"
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
	ctx := context.Background()
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	newProblemID := fmt.Sprintf("%d", rng.Intn(899999)+100000)

	// Begin transaction — 確保題目與測資一起成功或一起失敗
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }() // 如果 Commit 成功，Rollback 是 no-op

	qtx := r.queries.WithTx(tx)

	_, err = qtx.CreateProblem(ctx, sqlcdb.CreateProblemParams{
		ID:            newProblemID,
		Title:         prob.Title,
		Difficulty:    sql.NullString{String: prob.Difficulty, Valid: prob.Difficulty != ""},
		Description:   prob.Description,
		TimeLimitMs:   5000,
		MemoryLimitKb: 262144,
	})
	if err != nil {
		return fmt.Errorf("create problem: %w", err)
	}

	for _, tc := range prob.TestCases {
		newTCID := fmt.Sprintf("%d", rng.Intn(89999999)+10000000)
		err = qtx.CreateTestCase(ctx, sqlcdb.CreateTestCaseParams{
			ID:             newTCID,
			ProblemID:      sql.NullString{String: newProblemID, Valid: true},
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			IsHidden:       sql.NullBool{Bool: false, Valid: true},
		})
		if err != nil {
			return fmt.Errorf("create test case: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	id, _ := strconv.Atoi(newProblemID)
	prob.ID = id
	return nil
}

func (r *ProblemRepo) List() []domain.Problem {
	rows, err := r.db.Query(`SELECT id, title, difficulty, description FROM problems ORDER BY id DESC`)
	if err != nil {
		return []domain.Problem{}
	}
	// 修正 errcheck: 加上底線忽略錯誤
	defer func() { _ = rows.Close() }()

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
	defer func() { _ = rows.Close() }()

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

// ListAssigned 回傳指定考生被 assign 的所有題目
func (r *ProblemRepo) ListAssigned(userID string) []domain.Problem {
	query := `
		SELECT p.id, p.title, p.difficulty, p.description
		FROM problems p
		INNER JOIN user_problem_assignments upa ON p.id = upa.problem_id
		WHERE upa.user_id = $1
		ORDER BY p.id ASC`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return []domain.Problem{}
	}
	defer func() { _ = rows.Close() }()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		var diff sql.NullString
		var idStr string
		if err := rows.Scan(&idStr, &p.Title, &diff, &p.Description); err != nil {
			continue
		}
		p.ID, _ = strconv.Atoi(idStr)
		p.Difficulty = diff.String
		p.TestCases = r.getTestCasesByProblemID(p.ID)
		problems = append(problems, p)
	}
	if problems == nil {
		return []domain.Problem{}
	}
	return problems
}

// Assign 將一道題目指派給某位考生
func (r *ProblemRepo) Assign(userID, problemID string) error {
	_, err := r.db.Exec(
		`INSERT INTO user_problem_assignments (user_id, problem_id) VALUES ($1, $2) ON CONFLICT (user_id, problem_id) DO NOTHING`,
		userID, problemID,
	)
	return err
}

// Unassign 取消某位考生的題目指派
func (r *ProblemRepo) Unassign(userID, problemID string) error {
	_, err := r.db.Exec(
		`DELETE FROM user_problem_assignments WHERE user_id = $1 AND problem_id = $2`,
		userID, problemID,
	)
	return err
}

// GetAssignedProblemIDs 回傳某位考生被指派的所有題目 ID 字串
func (r *ProblemRepo) GetAssignedProblemIDs(userID string) []string {
	rows, err := r.db.Query(
		`SELECT problem_id FROM user_problem_assignments WHERE user_id = $1 ORDER BY problem_id ASC`,
		userID,
	)
	if err != nil {
		return []string{}
	}
	defer func() { _ = rows.Close() }()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	if ids == nil {
		return []string{}
	}
	return ids
}
