package repository

import (
	"database/sql"
	"fmt"
	"github.com/Dart147/SMC/backend/internal/domain"
)

type SubmissionRepo struct {
	db *sql.DB // ⚠️ 確保是真實的 sql.DB 物件，把舊的 mu 和 data map 刪掉
}

// ⚠️ 確保建構函式有接收並注入 *sql.DB
func NewSubmissionRepo(db *sql.DB) *SubmissionRepo {
	return &SubmissionRepo{db: db}
}

// 1. 當前端發送 POST 時，立刻寫入一筆真實的 Pending 資料到 PostgreSQL
func (r *SubmissionRepo) Save(s domain.Submission) error {
	query := `
		INSERT INTO submissions (id, problem_id, code, language, status, passed_test_cases, total_test_cases)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(query, s.ID, s.ProblemID, s.Code, s.Language, s.Status, s.PassedTestCases, s.TotalTestCases)
	if err != nil {
		return fmt.Errorf("failed to save submission to postgres: %w", err)
	}
	return nil
}

// 2. 當前端 Polling 輪詢發送 GET 時，從 PostgreSQL 撈出最新狀態
func (r *SubmissionRepo) GetByID(id string) (domain.Submission, bool) {
	var s domain.Submission

	// 使用 COALESCE 處理可能為 NULL 的欄位，防止 Go 發生 Scan 錯誤
	query := `
		SELECT id, problem_id, code, language, status, 
		       passed_test_cases, total_test_cases, 
		       COALESCE(output, ''), COALESCE(expected_output, ''), COALESCE(error, '')
		FROM submissions
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&s.ID, &s.ProblemID, &s.Code, &s.Language, &s.Status,
		&s.PassedTestCases, &s.TotalTestCases,
		&s.Output, &s.ExpectedOutput, &s.Error,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return s, false
		}
		return s, false
	}

	return s, true
}

// 3. 當背景 Sandbox 評測完畢，將最終結果更新回 PostgreSQL
func (r *SubmissionRepo) Update(s domain.Submission) error {
	query := `
		UPDATE submissions 
		SET status = $1, 
		    passed_test_cases = $2, 
		    output = $3, 
		    expected_output = $4, 
		    error = $5
		WHERE id = $6
	`

	result, err := r.db.Exec(query, s.Status, s.PassedTestCases, s.Output, s.ExpectedOutput, s.Error, s.ID)
	if err != nil {
		return fmt.Errorf("failed to update submission in postgres: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("submission %q not found", s.ID)
	}

	return nil
}

// 4. 獲取所有提交紀錄 (供前端歷史列表顯示)
func (r *SubmissionRepo) List() []domain.Submission {
	query := `
		SELECT id, problem_id, code, language, status, 
		       passed_test_cases, total_test_cases, 
		       COALESCE(output, ''), COALESCE(expected_output, ''), COALESCE(error, '')
		FROM submissions
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		fmt.Printf("failed to query submissions: %v\n", err)
		return []domain.Submission{} // 發生錯誤時回傳空陣列，避免前端炸掉
	}
	defer func() {
		if err := rows.Close(); err != nil {
			fmt.Printf("failed to close submission rows: %v\n", err)
		}
	}()

	var submissions []domain.Submission
	for rows.Next() {
		var s domain.Submission
		err := rows.Scan(
			&s.ID, &s.ProblemID, &s.Code, &s.Language, &s.Status,
			&s.PassedTestCases, &s.TotalTestCases,
			&s.Output, &s.ExpectedOutput, &s.Error,
		)
		if err == nil {
			submissions = append(submissions, s)
		} else {
			fmt.Printf("failed to scan submission row: %v\n", err)
		}
	}

	if submissions == nil {
		return []domain.Submission{}
	}

	return submissions
}
