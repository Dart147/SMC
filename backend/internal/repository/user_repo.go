package repository

import (
	"database/sql"
	"errors"
	"time"
)

type User struct {
	ID            string
	Username      string
	Password      string 
	Role          string
	ExamStartedAt *time.Time // 🌟 修正 1：補上這個欄位！(用指標是因為還沒考過試的人會是 NULL)
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetUserByUsername(username string) (*User, error) {
	user := &User{}

	// 🌟 修正 2：SQL 語句必須把 exam_started_at 也 SELECT 出來
	query := `SELECT id, username, password_hash, role, exam_started_at FROM users WHERE username = $1`

	// 🌟 修正 3：Scan 時要把值對應塞進 &user.ExamStartedAt
	err := r.db.QueryRow(query, username).Scan(
		&user.ID, 
		&user.Username, 
		&user.Password, 
		&user.Role, 
		&user.ExamStartedAt,
	)
	
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
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