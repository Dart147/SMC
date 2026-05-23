// internal/db/seed.go
package db

import (
	"database/sql"
	"log"
	"os"

	"github.com/Dart147/SMC/backend/internal/utils" // 引入我們上一篇寫的 hash.go
	"github.com/google/uuid"
)

// SeedAdminUser 會在系統啟動時執行，確保 Admin 帳號安全寫入 DB
func SeedAdminUser(db *sql.DB) {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminUsername == "" || adminPassword == "" {
		log.Println("⚠️  Warning: ADMIN_USERNAME or ADMIN_PASSWORD is not set in .env")
		return
	}

	// 1. 將帳號與密碼進行高等級加密
	hashedUsername := utils.HashUsername(adminUsername)
	passwordHash, err := utils.HashPassword(adminPassword)
	if err != nil {
		log.Fatalf("❌ Failed to hash admin password: %v", err)
	}

	// 2. 檢查該 Admin 是否已經存在 (使用加密後的帳號搜尋)
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username=$1)", hashedUsername).Scan(&exists)
	if err != nil {
		log.Fatalf("❌ Failed to check admin existence: %v", err)
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
			log.Fatalf("❌ Failed to seed admin user: %v", err)
		}
		log.Println("✅ Enterprise Admin user successfully seeded with Blind Indexing!")
	} else {
		// (可選) 如果已存在，你也可以選擇更新密碼，確保與 .env 保持同步
		log.Println("ℹ️  Admin user already exists. Skipping seed.")
	}
}
