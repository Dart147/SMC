package repository

import (
	"database/sql"
	"errors"
	"time"
)

type User struct {
	ID            string
	Username      string
	Password      string // 對應 db 的 PasswordHash
	Role          string
	ExamStartedAt *time.Time
	ExamEndedAt   *time.Time
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetUserByUsername(username string) (*User, error) {
	user := &User{}

	// 修正 1：建立中介變數，用來接住資料庫裡「可能為 NULL」的時間
	var dbStartedAt sql.NullTime
	var dbEndedAt sql.NullTime

	// 修正 2：SQL 語句必須把 exam_ended_at 也 SELECT 出來，總共 6 個欄位
	query := `
		SELECT id, username, password_hash, role, exam_started_at, exam_ended_at 
		FROM users 
		WHERE username = $1
	`

	// 修正 3：Scan 時，把時間塞進剛剛宣告的 sql.NullTime 中介變數
	err := r.db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Password,
		&user.Role,
		&dbStartedAt, // 🛡️ 安全緩衝
		&dbEndedAt,   // 🛡️ 安全緩衝
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// 修正 4：手動「翻譯」。如果資料庫拿出來的時間不是 NULL，才賦值給我們的乾淨指標
	if dbStartedAt.Valid {
		user.ExamStartedAt = &dbStartedAt.Time
	}
	if dbEndedAt.Valid {
		user.ExamEndedAt = &dbEndedAt.Time
	}

	return user, nil
}

func (r *UserRepository) CreateUser(id, username, passwordHash, role string) error {
	query := `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(query, id, username, passwordHash, role)
	return err
}

func (r *UserRepository) UpdateUserExamStartedAt(userID string, startedAt time.Time) error {
	query := `UPDATE users SET exam_started_at = $1 WHERE id = $2`
	_, err := r.db.Exec(query, startedAt, userID)
	return err
}
