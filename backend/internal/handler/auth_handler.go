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
	// 1. 定義局部結構體接收前端請求
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	// 2. 解析 JSON 請求本體
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest) // 400
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// 驗證欄位不可為空
	if req.Username == "" || req.Password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest) // 400
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Username and password are required"})
		return
	}

	// 3. 呼叫核心商業邏輯（統一使用 h.authService）
	token, err := h.svc.Login(req.Username, req.Password)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")

		// 狀況 A：如果是 3 小時考試時間到了
		if err.Error() == "EXAM_EXPIRED" {
			w.WriteHeader(http.StatusForbidden) // 403 Forbidden
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "考試時間已結束，帳號已失效"})
			return
		}

		// 狀況 B：密碼打錯或帳號不存在（維持 401，符合資安防猜測原則）
		w.WriteHeader(http.StatusUnauthorized) // 401 Unauthorized
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid username or password"})
		return
	}

	// 4. 驗證成功：回傳 200 OK 與 JWT Token
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	_ = json.NewEncoder(w).Encode(map[string]string{
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
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "User created successfully"})
}
