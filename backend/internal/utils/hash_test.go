package utils

import (
	"strings"
	"testing"
)

func TestHashUsername(t *testing.T) {
	if got := HashUsername("alice"); got != "alice" {
		t.Errorf("HashUsername = %q, want %q", got, "alice")
	}
	if got := HashUsername(""); got != "" {
		t.Errorf("HashUsername empty = %q, want empty string", got)
	}
	if got := HashUsername("Admin"); got != "Admin" {
		t.Errorf("HashUsername = %q, want %q", got, "Admin")
	}
}

func TestHashPassword_ProducesNonEmptyHash(t *testing.T) {
	hash, err := HashPassword("secret123")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if hash == "" {
		t.Fatal("expected non-empty hash")
	}
	if hash == "secret123" {
		t.Fatal("hash must not equal plaintext")
	}
	if !strings.HasPrefix(hash, "$2a$") && !strings.HasPrefix(hash, "$2b$") {
		t.Errorf("hash does not look like a bcrypt hash: %q", hash)
	}
}

func TestHashPassword_UniquePerCall(t *testing.T) {
	h1, _ := HashPassword("same")
	h2, _ := HashPassword("same")
	if h1 == h2 {
		t.Error("expected different hashes for the same password (bcrypt salts)")
	}
}

func TestCheckPasswordHash_CorrectPassword(t *testing.T) {
	hash, err := HashPassword("mypassword")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !CheckPasswordHash("mypassword", hash) {
		t.Error("CheckPasswordHash: expected true for correct password")
	}
}

func TestCheckPasswordHash_WrongPassword(t *testing.T) {
	hash, _ := HashPassword("mypassword")
	if CheckPasswordHash("wrong", hash) {
		t.Error("CheckPasswordHash: expected false for wrong password")
	}
}

func TestCheckPasswordHash_InvalidHash(t *testing.T) {
	if CheckPasswordHash("anything", "notahash") {
		t.Error("CheckPasswordHash: expected false for invalid hash string")
	}
}

func TestCheckPasswordHash_EmptyInputs(t *testing.T) {
	if CheckPasswordHash("", "") {
		t.Error("CheckPasswordHash: expected false for empty inputs")
	}
}
