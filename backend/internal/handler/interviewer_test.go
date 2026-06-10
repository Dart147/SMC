package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

var candidateCols = []string{
	"id", "username", "role", "created_at", "warning_count",
	"overall_score", "sub_id", "p_title", "sub_status",
	"code_style_score", "passed", "total", "run_time_ms",
}

func TestInterviewerHandler_GetCandidates_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	rows := sqlmock.NewRows(candidateCols).
		AddRow("u1", "alice_hash", "candidate", "2024-01-01", 0, 90, "s1", "Two Sum", "Accepted", 95, 3, 3, 100).
		AddRow("u1", "alice_hash", "candidate", "2024-01-01", 0, 90, "", "未命名題目", "Ready", 0, 0, 0, 0).
		AddRow("u2", "bob_hash", "candidate", "2024-01-02", 1, 50, "", "未命名題目", "Ready", 0, 0, 0, 0)
	mock.ExpectQuery(`SELECT`).WillReturnRows(rows)

	h := NewInterviewerHandler(db)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/interviewer/candidates", nil)
	h.GetCandidates(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetCandidates: got %d, want 200", w.Code)
	}
}

func TestInterviewerHandler_GetCandidates_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT`).WillReturnError(sqlmock.ErrCancelled)

	h := NewInterviewerHandler(db)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/interviewer/candidates", nil)
	h.GetCandidates(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("GetCandidates error: got %d, want 500", w.Code)
	}
}

func TestInterviewerHandler_GetCandidates_AdminDisplayName(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	rows := sqlmock.NewRows(candidateCols).
		AddRow("admin1", "admin_hash", "admin", "2024-01-01", 0, 0, "", "未命名題目", "Ready", 0, 0, 0, 0)
	mock.ExpectQuery(`SELECT`).WillReturnRows(rows)

	h := NewInterviewerHandler(db)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/interviewer/candidates", nil)
	h.GetCandidates(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("admin request: got %d, want 200", w.Code)
	}
}
