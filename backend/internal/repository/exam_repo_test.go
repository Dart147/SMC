package repository

import (
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestExamRepo_StartExam_ValidTime(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"exam_started_at"}).AddRow(now)
	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnRows(rows)

	repo := NewExamRepo(db)
	got, err := repo.StartExam("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.Equal(now) {
		t.Errorf("StartExam: got %v, want %v", got, now)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestExamRepo_StartExam_NullTime_FallsBackToNow(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	rows := sqlmock.NewRows([]string{"exam_started_at"}).AddRow(sql.NullTime{Valid: false})
	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnRows(rows)

	repo := NewExamRepo(db)
	before := time.Now()
	got, err := repo.StartExam("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Before(before) {
		t.Errorf("fallback time should be ~now, got %v", got)
	}
}

func TestExamRepo_StartExam_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnError(errDuplicate)

	repo := NewExamRepo(db)
	_, err = repo.StartExam("u1")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestExamRepo_IncrementWarning_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	rows := sqlmock.NewRows([]string{"warning_count"}).AddRow(int32(3))
	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnRows(rows)

	repo := NewExamRepo(db)
	count, err := repo.IncrementWarning("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 3 {
		t.Errorf("count: got %d, want 3", count)
	}
}

func TestExamRepo_IncrementWarning_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnError(errDuplicate)

	repo := NewExamRepo(db)
	_, err = repo.IncrementWarning("u1")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestExamRepo_EndExam_ValidTime(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"exam_ended_at"}).AddRow(now)
	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnRows(rows)

	repo := NewExamRepo(db)
	got, err := repo.EndExam("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.Equal(now) {
		t.Errorf("EndExam: got %v, want %v", got, now)
	}
}

func TestExamRepo_EndExam_NullTime(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	rows := sqlmock.NewRows([]string{"exam_ended_at"}).AddRow(sql.NullTime{Valid: false})
	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnRows(rows)

	repo := NewExamRepo(db)
	before := time.Now()
	got, err := repo.EndExam("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Before(before) {
		t.Errorf("fallback time should be ~now, got %v", got)
	}
}

func TestExamRepo_EndExam_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`UPDATE users`).WithArgs("u1").WillReturnError(errDuplicate)

	repo := NewExamRepo(db)
	_, err = repo.EndExam("u1")
	if err == nil {
		t.Fatal("expected error")
	}
}
