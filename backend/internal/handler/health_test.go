package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/healthz", nil)
	Health(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("Health: got %d, want 200", w.Code)
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Health: invalid JSON: %v", err)
	}
	if resp["status"] != "ok" {
		t.Errorf("Health: got status %q, want %q", resp["status"], "ok")
	}
}
