package seed

import (
	"database/sql"
	"os"

	"github.com/Dart147/SMC/backend/internal/utils" // 引入我們上一篇寫的 hash.go
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AdminUser 會在系統啟動時執行，確保 Admin 帳號安全寫入 DB
func AdminUser(db *sql.DB, logger *zap.Logger) {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminUsername == "" || adminPassword == "" {
		logger.Warn("admin seed skipped: ADMIN_USERNAME or ADMIN_PASSWORD not set")
		return
	}

	// 1. 將帳號與密碼進行高等級加密
	hashedUsername := utils.HashUsername(adminUsername)
	passwordHash, err := utils.HashPassword(adminPassword)
	if err != nil {
		logger.Fatal("failed to hash admin password", zap.Error(err))
	}

	// 2. 檢查該 Admin 是否已經存在 (使用加密後的帳號搜尋)
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username=$1)", hashedUsername).Scan(&exists)
	if err != nil {
		logger.Fatal("failed to check admin existence", zap.Error(err))
	}

	// 3. 如果不存在，就插入這筆最高權限帳號
	if !exists {
		adminID := uuid.New().String() // 產生一組 UUID 給 Admin

		query := `
			INSERT INTO users (id, username, password_hash, role)
			VALUES ($1, $2, $3, 'admin')
		`
		_, err = db.Exec(query, adminID, hashedUsername, passwordHash)
		if err != nil {
			logger.Fatal("failed to seed admin user", zap.Error(err))
		}
		logger.Info("admin user seeded")
	} else {
		// (可選) 如果已存在，你也可以選擇更新密碼，確保與 .env 保持同步
		logger.Info("admin user already exists, skipping seed")
	}
}
