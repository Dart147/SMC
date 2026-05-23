// internal/handler/auth_handler.go
package handler

import (
	"encoding/json"
	"github.com/Dart147/SMC/backend/internal/service"
	"net/http"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	token, err := h.svc.Login(req.Username, req.Password)
	if err != nil {
		// 為了資安，帳號或密碼錯誤都統一回傳 Unauthorized，防猜測
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
	})
}

func (h *AuthHandler) CreateCandidate(w http.ResponseWriter, r *http.Request) {
	// ⚠️ 在正式企業環境中，這裡應該要先解析 Request Header 的 JWT Token，
	// 驗證呼叫這支 API 的人是不是 admin。為了讓你先順利跑通，我們先實作核心邏輯。

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 呼叫 Service 建立帳號
	if err := h.svc.CreateCandidate(req.Username, req.Password); err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// 成功回傳 201 Created
	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User created successfully"})
}
