package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"

// RequireAuth 是一個 Middleware，負責攔截請求、驗證 JWT，並將 userID 注入 Context
func RequireAuth(secretKey []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. 從 Header 取得 Authorization 欄位
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
				return
			}

			// 2. 檢查格式是否為 "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, "Invalid token format", http.StatusUnauthorized)
				return
			}
			tokenString := parts[1]

			// 3. 解析並驗證 Token
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				// 確保簽章方法是正確的 HMAC
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, http.ErrNotSupported
				}
				return secretKey, nil
			})

			if err != nil || !token.Valid {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			// 4. 提取 Claims (Payload)
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Invalid token claims", http.StatusUnauthorized)
				return
			}

			// 5. 取得 user ID (我們在 auth_service.go 裡面把它存在 "sub" 欄位)
			userID, ok := claims["sub"].(string)
			if !ok || userID == "" {
				http.Error(w, "User ID not found in token", http.StatusUnauthorized)
				return
			}

			// 🌟 6. 最重要的一步：將 userID 放入 Request Context 供後續的 Handler 使用
			// 注意這裡的 key "userID" 必須與 exam_handler.go 裡取出的字串完全一致！
			ctx := context.WithValue(r.Context(), UserIDKey, userID)

			// 帶著新的 Context 繼續執行下一個 Handler
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
