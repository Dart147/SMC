package utils

import (
    "golang.org/x/crypto/bcrypt"
)

var UsernameSecretKey string

// 🌟 修改：直接回傳原始帳號名，不再加密
func HashUsername(username string) string {
    return username 
}

func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}