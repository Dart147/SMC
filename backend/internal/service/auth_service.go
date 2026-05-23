package service

import (
	"errors"
	"time"
	"fmt"
	"github.com/Dart147/SMC/backend/internal/repository"
	"github.com/Dart147/SMC/backend/internal/utils"
	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	repo      *repository.UserRepository
	jwtSecret []byte
}

func NewAuthService(repo *repository.UserRepository, secret string) *AuthService {
	return &AuthService{repo: repo, jwtSecret: []byte(secret)}
}

func (s *AuthService) Login(username, password string) (string, error) {
	// 1. 將明文帳號進行 HMAC 雜湊
	hashedUsername := utils.HashUsername(username)

	// 2. 用雜湊後的帳號去資料庫找人
	user, err := s.repo.GetUserByUsername(hashedUsername)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	isValid := utils.CheckPasswordHash(password, user.Password)
	if !isValid {
		return "", errors.New("invalid credentials")
	}

	// 4. 產生 JWT Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(time.Hour * 24).Unix(), // 24小時後過期
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