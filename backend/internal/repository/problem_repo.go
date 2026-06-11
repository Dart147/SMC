package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"math/big"
	"strconv"
	"strings"

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
	nProb, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return fmt.Errorf("generate problem id failed: %w", err)
	}
	newProblemID := fmt.Sprintf("%d", nProb.Int64()+100000)

	// Begin transaction — 確保題目與測資一起成功或一起失敗
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }() // 如果 Commit 成功，Rollback 是 no-op

	qtx := r.queries.WithTx(tx)

	timeLimitMs := prob.TimeLimitMs
	if timeLimitMs <= 0 {
		timeLimitMs = 5000
	}
	_, err = qtx.CreateProblem(ctx, sqlcdb.CreateProblemParams{
		ID:            newProblemID,
		Title:         prob.Title,
		Difficulty:    sql.NullString{String: prob.Difficulty, Valid: prob.Difficulty != ""},
		Description:   prob.Description,
		TimeLimitMs:   int32(timeLimitMs),
		MemoryLimitKb: 262144,
	})
	if err != nil {
		return fmt.Errorf("create problem: %w", err)
	}

	for _, tc := range prob.TestCases {
		nTC, err := rand.Int(rand.Reader, big.NewInt(90000000))
		if err != nil {
			return fmt.Errorf("generate test case id failed: %w", err)
		}
		newTCID := fmt.Sprintf("%d", nTC.Int64()+10000000)
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
	rows, err := r.db.Query(`SELECT id, title, difficulty, description, time_limit_ms FROM problems ORDER BY id ASC`)
	if err != nil {
		return []domain.Problem{}
	}
	// 修正 errcheck: 加上底線忽略錯誤
	defer func() { _ = rows.Close() }()

	var problems []domain.Problem
	for rows.Next() {
		var p domain.Problem
		var diff sql.NullString
		if err := rows.Scan(&p.ID, &p.Title, &diff, &p.Description, &p.TimeLimitMs); err != nil {
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
	err := r.db.QueryRow(`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id = $1`, id).
		Scan(&p.ID, &p.Title, &diff, &p.Description, &p.TimeLimitMs)
	if err != nil {
		return domain.Problem{}, false
	}
	p.Difficulty = diff.String
	p.TestCases = r.getTestCasesByProblemID(p.ID)
	return p, true
}

func (r *ProblemRepo) getTestCasesByProblemID(pID int) []domain.TestCase {
	query := `SELECT input, expected_output, COALESCE(is_hidden, false) FROM test_cases WHERE problem_id = $1 ORDER BY id ASC`
	rows, err := r.db.Query(query, pID)
	if err != nil {
		return []domain.TestCase{}
	}
	defer func() { _ = rows.Close() }()

	var tcs []domain.TestCase
	for rows.Next() {
		var tc domain.TestCase
		if err := rows.Scan(&tc.Input, &tc.ExpectedOutput, &tc.IsHidden); err == nil {
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
		SELECT p.id, p.title, p.difficulty, p.description, p.time_limit_ms
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
		if err := rows.Scan(&idStr, &p.Title, &diff, &p.Description, &p.TimeLimitMs); err != nil {
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

// Delete removes a problem and all related data (test cases, assignments, submissions cascade via FK)
func (r *ProblemRepo) Delete(id string) error {
	res, err := r.db.Exec(`DELETE FROM problems WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("problem %s not found", id)
	}
	return nil
}

// Update replaces a problem's metadata and all its test cases atomically.
func (r *ProblemRepo) Update(id string, prob *domain.Problem) error {
	ctx := context.Background()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	timeLimitMs := prob.TimeLimitMs
	if timeLimitMs <= 0 {
		timeLimitMs = 5000
	}
	res, err := tx.ExecContext(ctx,
		`UPDATE problems SET title = $1, difficulty = $2, description = $3, time_limit_ms = $4 WHERE id = $5`,
		prob.Title, prob.Difficulty, prob.Description, timeLimitMs, id,
	)
	if err != nil {
		return fmt.Errorf("update problem: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("problem %s not found", id)
	}

	if _, err = tx.ExecContext(ctx, `DELETE FROM test_cases WHERE problem_id = $1`, id); err != nil {
		return fmt.Errorf("clear test cases: %w", err)
	}

	for _, tc := range prob.TestCases {
		nTC, err := rand.Int(rand.Reader, big.NewInt(90000000))
		if err != nil {
			return fmt.Errorf("generate test case id: %w", err)
		}
		newTCID := fmt.Sprintf("%d", nTC.Int64()+10000000)
		_, err = tx.ExecContext(ctx,
			`INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden) VALUES ($1, $2, $3, $4, $5)`,
			newTCID, id, tc.Input, tc.ExpectedOutput, sql.NullBool{Bool: tc.IsHidden, Valid: true},
		)
		if err != nil {
			return fmt.Errorf("insert test case: %w", err)
		}
	}

	return tx.Commit()
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
