package service

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Dart147/SMC/backend/internal/repository"
	"github.com/Dart147/SMC/backend/internal/utils"
)

type mockUserRepo struct {
	user      *repository.User
	userErr   error
	updateErr error
	createErr error
}

func (m *mockUserRepo) GetUserByUsername(username string) (*repository.User, error) {
	return m.user, m.userErr
}
func (m *mockUserRepo) UpdateUserExamStartedAt(userID string, startedAt time.Time) error {
	return m.updateErr
}
func (m *mockUserRepo) CreateUser(id, username, passwordHash, role string) error {
	return m.createErr
}

func validCandidateUser(t *testing.T) *repository.User {
	t.Helper()
	hash, err := utils.HashPassword("pass123")
	if err != nil {
		t.Fatal(err)
	}
	return &repository.User{
		ID:       "u1",
		Username: utils.HashUsername("alice"),
		Password: hash,
		Role:     "candidate",
	}
}

func validAdminUser(t *testing.T) *repository.User {
	t.Helper()
	hash, err := utils.HashPassword("adminpass")
	if err != nil {
		t.Fatal(err)
	}
	return &repository.User{
		ID:       "admin1",
		Username: utils.HashUsername("admin"),
		Password: hash,
		Role:     "admin",
	}
}

func TestAuthService_Login_UserNotFound(t *testing.T) {
	svc := NewAuthService(&mockUserRepo{userErr: errors.New("user not found")}, "secret")
	_, err := svc.Login("alice", "pass123")
	if err == nil || err.Error() != "invalid credentials" {
		t.Errorf("expected 'invalid credentials', got %v", err)
	}
}

func TestAuthService_Login_WrongPassword(t *testing.T) {
	user := validCandidateUser(t)
	svc := NewAuthService(&mockUserRepo{user: user}, "secret")
	_, err := svc.Login("alice", "wrongpassword")
	if err == nil || err.Error() != "invalid credentials" {
		t.Errorf("expected 'invalid credentials', got %v", err)
	}
}

func TestAuthService_Login_AdminSuccess(t *testing.T) {
	user := validAdminUser(t)
	svc := NewAuthService(&mockUserRepo{user: user}, "secret")
	token, err := svc.Login("admin", "adminpass")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected non-empty token")
	}
}

func TestAuthService_Login_CandidateFirstLogin(t *testing.T) {
	user := validCandidateUser(t)
	// ExamStartedAt is nil → first login
	svc := NewAuthService(&mockUserRepo{user: user}, "secret")
	token, err := svc.Login("alice", "pass123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected non-empty JWT token")
	}
}

func TestAuthService_Login_CandidateWithinTimeWindow(t *testing.T) {
	user := validCandidateUser(t)
	started := time.Now().Add(-30 * time.Minute) // started 30 min ago, within 3h window
	user.ExamStartedAt = &started
	svc := NewAuthService(&mockUserRepo{user: user}, "secret")
	token, err := svc.Login("alice", "pass123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Error("expected non-empty JWT token")
	}
}

func TestAuthService_Login_CandidateExamExpired(t *testing.T) {
	user := validCandidateUser(t)
	started := time.Now().Add(-4 * time.Hour) // started 4h ago, over 3h limit
	user.ExamStartedAt = &started
	svc := NewAuthService(&mockUserRepo{user: user}, "secret")
	_, err := svc.Login("alice", "pass123")
	if err == nil || err.Error() != "EXAM_EXPIRED" {
		t.Errorf("expected 'EXAM_EXPIRED', got %v", err)
	}
}

func TestAuthService_Login_CandidateAlreadySubmitted(t *testing.T) {
	user := validCandidateUser(t)
	ended := time.Now().Add(-1 * time.Hour)
	user.ExamEndedAt = &ended
	svc := NewAuthService(&mockUserRepo{user: user}, "secret")
	_, err := svc.Login("alice", "pass123")
	if err == nil || err.Error() != "EXAM_ALREADY_SUBMITTED" {
		t.Errorf("expected 'EXAM_ALREADY_SUBMITTED', got %v", err)
	}
}

func TestAuthService_Login_UpdateExamStartFails(t *testing.T) {
	user := validCandidateUser(t)
	repo := &mockUserRepo{user: user, updateErr: errors.New("db error")}
	svc := NewAuthService(repo, "secret")
	_, err := svc.Login("alice", "pass123")
	if err == nil {
		t.Fatal("expected error when UpdateUserExamStartedAt fails")
	}
}

func TestAuthService_CreateCandidate_Success(t *testing.T) {
	svc := NewAuthService(&mockUserRepo{}, "secret")
	err := svc.CreateCandidate("bob", "password123")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestAuthService_CreateCandidate_DBError(t *testing.T) {
	svc := NewAuthService(&mockUserRepo{createErr: errors.New("unique violation")}, "secret")
	err := svc.CreateCandidate("bob", "password123")
	if err == nil {
		t.Fatal("expected error from repo.CreateUser")
	}
	if !strings.Contains(err.Error(), "unique violation") {
		t.Errorf("unexpected error message: %v", err)
	}
}
