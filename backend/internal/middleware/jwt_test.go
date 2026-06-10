package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/Dart147/SMC/backend/internal/middleware"
)

func TestRequireRole_AllowsMatchingRole(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.RoleKey, "admin"))
	rr := httptest.NewRecorder()
	middleware.RequireRole("admin")(next).ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestRequireRole_BlocksNonMatchingRole(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.RoleKey, "candidate"))
	rr := httptest.NewRecorder()
	middleware.RequireRole("admin")(next).ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

func TestRequireRole_BlocksMissingRole(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	middleware.RequireRole("admin")(next).ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}

func makeToken(t *testing.T, secret []byte, claims jwt.MapClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString(secret)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return s
}

func TestRequireAuth_MissingHeader(t *testing.T) {
	h := middleware.RequireAuth([]byte("secret"))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rr.Code)
	}
}

func TestRequireAuth_InvalidFormat_NoBearer(t *testing.T) {
	h := middleware.RequireAuth([]byte("secret"))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Token abc123")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rr.Code)
	}
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	h := middleware.RequireAuth([]byte("secret"))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer not.a.valid.token")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rr.Code)
	}
}

func TestRequireAuth_WrongSecret(t *testing.T) {
	tok := makeToken(t, []byte("secret-a"), jwt.MapClaims{
		"sub": "user1", "role": "candidate", "exp": time.Now().Add(time.Hour).Unix(),
	})
	h := middleware.RequireAuth([]byte("secret-b"))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rr.Code)
	}
}

func TestRequireAuth_ValidToken_InjectsContext(t *testing.T) {
	secret := []byte("my-secret")
	tok := makeToken(t, secret, jwt.MapClaims{
		"sub": "user-42", "role": "admin", "exp": time.Now().Add(time.Hour).Unix(),
	})

	var gotUserID, gotRole string
	h := middleware.RequireAuth(secret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID, _ = r.Context().Value(middleware.UserIDKey).(string)
		gotRole, _ = r.Context().Value(middleware.RoleKey).(string)
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("got %d, want 200", rr.Code)
	}
	if gotUserID != "user-42" {
		t.Errorf("userID: got %q, want user-42", gotUserID)
	}
	if gotRole != "admin" {
		t.Errorf("role: got %q, want admin", gotRole)
	}
}

func TestRequireAuth_ExpiredToken(t *testing.T) {
	secret := []byte("secret")
	tok := makeToken(t, secret, jwt.MapClaims{
		"sub": "user1", "exp": time.Now().Add(-time.Hour).Unix(),
	})
	h := middleware.RequireAuth(secret)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rr.Code)
	}
}

func TestRequireAuth_MissingSubClaim(t *testing.T) {
	secret := []byte("secret")
	tok := makeToken(t, secret, jwt.MapClaims{
		"role": "candidate", "exp": time.Now().Add(time.Hour).Unix(),
		// no "sub"
	})
	h := middleware.RequireAuth(secret)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rr.Code)
	}
}
