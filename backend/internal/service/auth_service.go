package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/Dart147/SMC/backend/internal/utils"
	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	repo      userRepo
	jwtSecret []byte
}

func NewAuthService(repo userRepo, secret string) *AuthService {
	return &AuthService{repo: repo, jwtSecret: []byte(secret)}
}

// 🌟 將舊的密碼驗證與新的考試時間邏輯完美合併的單一 Login 函式
func (s *AuthService) Login(username, password string) (string, error) {
	// 1. 將明文帳號進行 HMAC 雜湊 (Blind Indexing)
	hashedUsername := utils.HashUsername(username)

	// 2. 用雜湊後的帳號去資料庫找人
	user, err := s.repo.GetUserByUsername(hashedUsername)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	// 3. 驗證密碼 (使用你 utils 裡的封裝)
	isValid := utils.CheckPasswordHash(password, user.Password)
	if !isValid {
		return "", errors.New("invalid credentials")
	}

	// 4. 🌟 考試時間邏輯
	// 4. 🌟 考試時間與交卷狀態邏輯
	var examExpiresAt int64
	now := time.Now()
	examDuration := 3 * time.Hour // 3 小時

	// 只有一般考生 (candidate) 需要計算時間與狀態，admin 不需要
	if user.Role == "candidate" {
		// 🚨 終極防線：先檢查他是不是已經交卷了？
		// (確保你的 User struct 裡有 ExamEndedAt 這個欄位，通常 sqlc 更新後會有)
		if user.ExamEndedAt != nil {
			return "", errors.New("EXAM_ALREADY_SUBMITTED") // 傳遞給 Handler 轉成 403
		}

		if user.ExamStartedAt != nil {
			// 已經登入過了，檢查是否超時
			if now.After(user.ExamStartedAt.Add(examDuration)) {
				return "", errors.New("EXAM_EXPIRED") // 傳遞給 Handler 轉成 403
			}
		} else {
			// 第一次登入，寫入當前時間
			user.ExamStartedAt = &now
			if err := s.repo.UpdateUserExamStartedAt(user.ID, now); err != nil {
				return "", err
			}
		}
		// 計算具體的過期時間戳記
		examExpiresAt = user.ExamStartedAt.Add(examDuration).Unix()
	} else {
		// 如果是 admin，給他一個預設的 24 小時後過期時間，不影響前端邏輯
		examExpiresAt = now.Add(24 * time.Hour).Unix()
	}

	// 5. 產生 JWT Token，並把 exam_expires_at 塞進去給前端的 Zustand 讀取
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":             user.ID,
		"role":            user.Role,
		"exp":             now.Add(time.Hour * 24).Unix(), // Token 本身的存活時間 (24小時)
		"exam_expires_at": examExpiresAt,                  // 🌟 考試截止時間
	})

	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (s *AuthService) CreateCandidate(username, password string) error {
	// 1. 帳號隱盲索引 (HMAC)
	hashedUsername := utils.HashUsername(username)

	// 2. 密碼加密 (Bcrypt)
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return err
	}

	// 3. 產生一個簡單的唯一 ID (加上時間戳避免重複)
	id := fmt.Sprintf("usr_%d", time.Now().UnixNano())

	// 4. 寫入資料庫，強制賦予 'candidate' 角色
	return s.repo.CreateUser(id, hashedUsername, hashedPassword, "candidate")
}
