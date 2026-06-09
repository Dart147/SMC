package repository

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestUserRepo_GetUserByUsername_Found(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "role", "exam_started_at", "exam_ended_at"}).
		AddRow("u1", "alice_hash", "pass_hash", "candidate", now, nil)
	mock.ExpectQuery(`SELECT id, username, password_hash, role`).
		WithArgs("alice_hash").
		WillReturnRows(rows)

	repo := NewUserRepository(db)
	user, err := repo.GetUserByUsername("alice_hash")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != "u1" {
		t.Errorf("ID: got %q, want 'u1'", user.ID)
	}
	if user.ExamStartedAt == nil {
		t.Error("expected ExamStartedAt not nil")
	}
	if user.ExamEndedAt != nil {
		t.Error("expected ExamEndedAt nil")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestUserRepo_GetUserByUsername_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, username, password_hash, role`).
		WithArgs("nobody").
		WillReturnRows(sqlmock.NewRows([]string{"id", "username", "password_hash", "role", "exam_started_at", "exam_ended_at"}))

	repo := NewUserRepository(db)
	_, err = repo.GetUserByUsername("nobody")
	if err == nil {
		t.Fatal("expected error for missing user")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestUserRepo_CreateUser_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`INSERT INTO users`).
		WithArgs("u2", "bob_hash", "hash2", "candidate").
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewUserRepository(db)
	if err := repo.CreateUser("u2", "bob_hash", "hash2", "candidate"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestUserRepo_CreateUser_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`INSERT INTO users`).
		WillReturnError(errDuplicate)

	repo := NewUserRepository(db)
	if err := repo.CreateUser("u2", "dup", "hash", "candidate"); err == nil {
		t.Error("expected error")
	}
}

func TestUserRepo_UpdateUserExamStartedAt_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	now := time.Now()
	mock.ExpectExec(`UPDATE users SET exam_started_at`).
		WithArgs(now, "u1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewUserRepository(db)
	if err := repo.UpdateUserExamStartedAt("u1", now); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestUserRepo_UpdateUserExamStartedAt_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`UPDATE users SET exam_started_at`).
		WillReturnError(errDuplicate)

	repo := NewUserRepository(db)
	if err := repo.UpdateUserExamStartedAt("u1", time.Now()); err == nil {
		t.Error("expected error")
	}
}
