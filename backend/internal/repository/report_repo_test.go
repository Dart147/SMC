package repository

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestReportRepo_GetCandidateScores_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"user_id", "username", "exam_started_at", "total_score", "problems_attempted", "problems_accepted"}).
		AddRow("u1", "alice", now, int32(90), int32(2), int32(2)).
		AddRow("u2", "bob", nil, int32(50), int32(1), int32(0))
	mock.ExpectQuery(`SELECT`).WillReturnRows(rows)

	repo := NewReportRepo(db)
	scores, err := repo.GetCandidateScores()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(scores) != 2 {
		t.Fatalf("got %d scores, want 2", len(scores))
	}
	if scores[0].UserID != "u1" {
		t.Errorf("first score user: got %q, want 'u1'", scores[0].UserID)
	}
	if scores[0].ExamStartedAt == nil {
		t.Error("expected ExamStartedAt not nil for u1")
	}
	if scores[1].ExamStartedAt != nil {
		t.Error("expected ExamStartedAt nil for u2")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Error(err)
	}
}

func TestReportRepo_GetCandidateScores_Empty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectQuery(`SELECT`).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "username", "exam_started_at", "total_score", "problems_attempted", "problems_accepted"}))

	repo := NewReportRepo(db)
	scores, err := repo.GetCandidateScores()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(scores) != 0 {
		t.Errorf("expected empty, got %d", len(scores))
	}
}

func TestReportRepo_GetCandidateScores_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	mock.ExpectQuery(`SELECT`).WillReturnError(errDuplicate)

	repo := NewReportRepo(db)
	_, err = repo.GetCandidateScores()
	if err == nil {
		t.Fatal("expected error")
	}
}
