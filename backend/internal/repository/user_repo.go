package repository

import (
	"database/sql"
	"errors"
)

// 🌟 修正 1：確保 ID 是 string 型別 (對應資料庫的 VARCHAR UUID)
type User struct {
	ID       string
	Username string
	Password string // 這裡在 Go 裡面維持叫 Password 沒關係，用來接資料庫的值
	Role     string
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetUserByUsername(username string) (*User, error) {
	user := &User{}
	
	// 🌟 修正 2：把查詢語句中的 password 改成 password_hash
	query := `SELECT id, username, password_hash, role FROM users WHERE username = $1`
	
	// Scan 會依序把找出來的值塞進我們定義的 user 變數裡
	err := r.db.QueryRow(query, username).Scan(&user.ID, &user.Username, &user.Password, &user.Role)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return user, nil
}