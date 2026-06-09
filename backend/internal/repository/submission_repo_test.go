package repository

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Dart147/SMC/backend/internal/domain"
)

var submissionColumns = []string{
	"id", "problem_id", "user_id", "code", "language",
	"status", "passed_test_cases", "total_test_cases",
	"execution_time_ms", "output", "expected_output", "error",
}

func newSubRow(id, problemID, code, lang string) *sqlmock.Rows {
	return sqlmock.NewRows(submissionColumns).
		AddRow(id,
			sql.NullString{String: problemID, Valid: true},
			sql.NullString{String: "u1", Valid: true},
			code, lang,
			sql.NullString{String: "Pending", Valid: true},
			sql.NullInt32{Int32: 0, Valid: true},
			sql.NullInt32{Int32: 3, Valid: true},
			int32(0), "", "", "")
}

// --- Update ---

func TestSubmissionRepo_Update_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`UPDATE submissions`).
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewSubmissionRepo(db)
	s := domain.Submission{ID: "s1", Status: "Accepted"}
	if err := repo.Update(s); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestSubmissionRepo_Update_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`UPDATE submissions`).WillReturnError(errDuplicate)

	repo := NewSubmissionRepo(db)
	if err := repo.Update(domain.Submission{ID: "s1"}); err == nil {
		t.Error("expected error")
	}
}

// --- Save ---

func TestSubmissionRepo_Save_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`INSERT INTO submissions`).
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewSubmissionRepo(db)
	s := domain.Submission{ID: "s2", ProblemID: "p1", UserID: "u1", Code: "code", Language: "go", Status: "Pending"}
	if err := repo.Save(s); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestSubmissionRepo_Save_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`INSERT INTO submissions`).WillReturnError(errDuplicate)

	repo := NewSubmissionRepo(db)
	if err := repo.Save(domain.Submission{ID: "s2"}); err == nil {
		t.Error("expected error")
	}
}

// --- GetByID ---

func TestSubmissionRepo_GetByID_Found(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT.*FROM submissions`).
		WithArgs("s1").
		WillReturnRows(newSubRow("s1", "p1", "func main(){}", "go"))

	repo := NewSubmissionRepo(db)
	sub, ok := repo.GetByID("s1")
	if !ok {
		t.Fatal("expected found")
	}
	if sub.ID != "s1" {
		t.Errorf("ID: got %q, want 's1'", sub.ID)
	}
}

func TestSubmissionRepo_GetByID_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT.*FROM submissions`).
		WithArgs("nope").
		WillReturnRows(sqlmock.NewRows(submissionColumns))

	repo := NewSubmissionRepo(db)
	_, ok := repo.GetByID("nope")
	if ok {
		t.Error("expected not found")
	}
}

// --- List ---

func TestSubmissionRepo_List_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT.*FROM submissions`).
		WillReturnRows(
			sqlmock.NewRows(submissionColumns).
				AddRow("s1", sql.NullString{String: "p1", Valid: true}, sql.NullString{String: "u1", Valid: true},
					"code", "go", sql.NullString{String: "Accepted", Valid: true},
					sql.NullInt32{Int32: 3, Valid: true}, sql.NullInt32{Int32: 3, Valid: true},
					int32(100), "ok", "ok", ""),
		)

	repo := NewSubmissionRepo(db)
	subs := repo.List()
	if len(subs) != 1 {
		t.Errorf("got %d, want 1", len(subs))
	}
}

func TestSubmissionRepo_List_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT.*FROM submissions`).WillReturnError(errDuplicate)

	repo := NewSubmissionRepo(db)
	subs := repo.List()
	if len(subs) != 0 {
		t.Errorf("expected empty on error, got %d", len(subs))
	}
}

// --- GetLatestByProblem ---

func TestSubmissionRepo_GetLatestByProblem_Found(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT.*FROM submissions`).
		WillReturnRows(newSubRow("s3", "p2", "code2", "python"))

	repo := NewSubmissionRepo(db)
	sub, ok := repo.GetLatestByProblem("p2")
	if !ok {
		t.Fatal("expected found")
	}
	if sub.ProblemID != "p2" {
		t.Errorf("ProblemID: got %q, want 'p2'", sub.ProblemID)
	}
}

func TestSubmissionRepo_GetLatestByProblem_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT.*FROM submissions`).
		WillReturnRows(sqlmock.NewRows(submissionColumns))

	repo := NewSubmissionRepo(db)
	_, ok := repo.GetLatestByProblem("p99")
	if ok {
		t.Error("expected not found")
	}
}

// --- ClaimNext ---

func TestSubmissionRepo_ClaimNext_Found(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	claimCols := []string{"id", "problem_id", "user_id", "code", "language",
		"status", "passed_test_cases", "total_test_cases",
		"execution_time_ms", "output", "expected_output", "error"}
	mock.ExpectQuery(`WITH next_job`).
		WillReturnRows(
			sqlmock.NewRows(claimCols).
				AddRow("s10", sql.NullString{String: "p1", Valid: true}, sql.NullString{},
					"code", "go", sql.NullString{String: "Judging", Valid: true},
					sql.NullInt32{}, sql.NullInt32{}, int32(0), "", "", ""),
		)

	repo := NewSubmissionRepo(db)
	sub, err := repo.ClaimNext(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub == nil {
		t.Fatal("expected non-nil submission")
	}
	if sub.ID != "s10" {
		t.Errorf("ID: got %q, want 's10'", sub.ID)
	}
}

func TestSubmissionRepo_ClaimNext_Empty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`WITH next_job`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	repo := NewSubmissionRepo(db)
	sub, err := repo.ClaimNext(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub != nil {
		t.Error("expected nil submission when queue is empty")
	}
}

// --- RecoverStalled ---

func TestSubmissionRepo_RecoverStalled_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`UPDATE submissions SET status`).
		WillReturnResult(sqlmock.NewResult(0, 2))

	repo := NewSubmissionRepo(db)
	if err := repo.RecoverStalled(context.Background()); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

// --- ListByUserID ---

var listByUserCols = []string{
	"id", "problem_title", "problem_id", "language", "status",
	"passed_test_cases", "total_test_cases", "score",
	"execution_time_ms", "output", "expected_output", "error",
}

func TestSubmissionRepo_ListByUserID_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT s.id`).
		WithArgs("u1").
		WillReturnRows(
			sqlmock.NewRows(listByUserCols).
				AddRow("s1", "Two Sum", "p1", "go", "Accepted", 3, 3, 95, 100, "", "", ""),
		)

	repo := NewSubmissionRepo(db)
	subs := repo.ListByUserID("u1")
	if len(subs) != 1 {
		t.Errorf("got %d, want 1", len(subs))
	}
	if subs[0].UserID != "u1" {
		t.Errorf("UserID: got %q, want 'u1'", subs[0].UserID)
	}
}

func TestSubmissionRepo_ListByUserID_Error(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT s.id`).WillReturnError(errDuplicate)

	repo := NewSubmissionRepo(db)
	subs := repo.ListByUserID("u1")
	if len(subs) != 0 {
		t.Errorf("expected empty on error, got %d", len(subs))
	}
}
