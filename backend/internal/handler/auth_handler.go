// internal/handler/auth_handler.go
package handler

import (
	"encoding/json"
	"net/http"
	"github.com/Dart147/SMC/backend/internal/service"
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