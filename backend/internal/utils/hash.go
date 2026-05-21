package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"golang.org/x/crypto/bcrypt"
)

var UsernameSecretKey string

func HashUsername(username string) string {
	if UsernameSecretKey == "" {
		panic("CRITICAL ERROR: UsernameSecretKey is not set!")
	}

	h := hmac.New(sha256.New, []byte(UsernameSecretKey))
	h.Write([]byte(username))
	return hex.EncodeToString(h.Sum(nil))
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}