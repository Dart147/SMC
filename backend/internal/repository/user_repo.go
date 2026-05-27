package repository

import (
	"context"
	"database/sql"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
)

type UserRepo struct {
	queries *sqlcdb.Queries
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{queries: sqlcdb.New(db)}
}

// 取得使用者以驗證登入密碼
func (r *UserRepo) GetUserByUsername(username string) (sqlcdb.User, bool) {
	ctx := context.Background()
	user, err := r.queries.GetUserByUsername(ctx, username)
	if err != nil {
		return sqlcdb.User{}, false
	}
	return sqlcdb.User{
		ID:           user.ID,
		Username:     user.Username,
		PasswordHash: user.PasswordHash,
		Email:        user.Email,
		Role:         user.Role,
	}, true
}