package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type mockAuthService struct {
	loginToken string
	loginErr   error
	createErr  error
}

func (m *mockAuthService) Login(username, password string) (string, error) {
	return m.loginToken, m.loginErr
}
func (m *mockAuthService) CreateCandidate(username, password string) error {
	return m.createErr
}

func TestAuthHandler_Login_Success(t *testing.T) {
	svc := &mockAuthService{loginToken: "tok.en.jwt"}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "alice", "password": "pass"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	h.Login(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("Login success: got %d, want 200", w.Code)
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Login success: invalid JSON: %v", err)
	}
	if resp["token"] != "tok.en.jwt" {
		t.Errorf("Login success: got token %q, want %q", resp["token"], "tok.en.jwt")
	}
}

func TestAuthHandler_Login_InvalidCredentials(t *testing.T) {
	svc := &mockAuthService{loginErr: errors.New("invalid credentials")}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "alice", "password": "wrong"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	h.Login(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Login invalid creds: got %d, want 401", w.Code)
	}
}

func TestAuthHandler_Login_ExamExpired(t *testing.T) {
	svc := &mockAuthService{loginErr: errors.New("EXAM_EXPIRED")}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "u", "password": "p"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	h.Login(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("Login exam expired: got %d, want 403", w.Code)
	}
}

func TestAuthHandler_Login_ExamAlreadySubmitted(t *testing.T) {
	svc := &mockAuthService{loginErr: errors.New("EXAM_ALREADY_SUBMITTED")}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "u", "password": "p"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	h.Login(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("Login already submitted: got %d, want 403", w.Code)
	}
}

func TestAuthHandler_Login_BadJSON(t *testing.T) {
	svc := &mockAuthService{}
	h := NewAuthHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString("notjson"))
	h.Login(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Login bad JSON: got %d, want 400", w.Code)
	}
}

func TestAuthHandler_Login_EmptyFields(t *testing.T) {
	svc := &mockAuthService{}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "", "password": ""})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	h.Login(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Login empty fields: got %d, want 400", w.Code)
	}
}

func TestAuthHandler_CreateCandidate_Success(t *testing.T) {
	svc := &mockAuthService{}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "newuser", "password": "pass123"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewReader(body))
	h.CreateCandidate(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("CreateCandidate success: got %d, want 201", w.Code)
	}
}

func TestAuthHandler_CreateCandidate_ServiceError(t *testing.T) {
	svc := &mockAuthService{createErr: errors.New("duplicate username")}
	h := NewAuthHandler(svc)

	body, _ := json.Marshal(map[string]string{"username": "dup", "password": "pass"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewReader(body))
	h.CreateCandidate(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("CreateCandidate service error: got %d, want 500", w.Code)
	}
}

func TestAuthHandler_CreateCandidate_BadJSON(t *testing.T) {
	svc := &mockAuthService{}
	h := NewAuthHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/users", bytes.NewBufferString("{bad"))
	h.CreateCandidate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("CreateCandidate bad JSON: got %d, want 400", w.Code)
	}
}
