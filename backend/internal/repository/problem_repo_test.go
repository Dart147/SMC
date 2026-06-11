package repository

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Dart147/SMC/backend/internal/domain"
)

var problemCols = []string{"id", "title", "difficulty", "description", "time_limit_ms"}

func newProblemRow(id, title, diff, desc string) *sqlmock.Rows {
	return sqlmock.NewRows(problemCols).AddRow(id, title, diff, desc, 5000)
}

// --- List ---

func TestProblemRepo_List_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems`).
		WillReturnRows(newProblemRow("100001", "Two Sum", "Easy", "desc").
			AddRow("100002", "LRU Cache", "Medium", "desc2", 5000))
	// each problem also calls getTestCasesByProblemID
	mock.ExpectQuery(`SELECT input, expected_output`).WillReturnRows(sqlmock.NewRows([]string{"input", "expected_output", "is_hidden"}))
	mock.ExpectQuery(`SELECT input, expected_output`).WillReturnRows(sqlmock.NewRows([]string{"input", "expected_output", "is_hidden"}))

	repo := NewProblemRepo(db)
	probs := repo.List()
	if len(probs) != 2 {
		t.Errorf("got %d problems, want 2", len(probs))
	}
}

func TestProblemRepo_List_QueryError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems`).
		WillReturnError(errDuplicate)

	repo := NewProblemRepo(db)
	probs := repo.List()
	if len(probs) != 0 {
		t.Errorf("expected empty on error, got %d", len(probs))
	}
}

// --- GetByID ---

func TestProblemRepo_GetByID_Found(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id`).
		WithArgs("100001").
		WillReturnRows(newProblemRow("100001", "Two Sum", "Easy", "find two numbers"))
	mock.ExpectQuery(`SELECT input, expected_output`).
		WillReturnRows(sqlmock.NewRows([]string{"input", "expected_output", "is_hidden"}).
			AddRow("[2,7,11,15]", "[0,1]", false))

	repo := NewProblemRepo(db)
	p, ok := repo.GetByID("100001")
	if !ok {
		t.Fatal("expected found")
	}
	if p.Title != "Two Sum" {
		t.Errorf("Title: got %q, want 'Two Sum'", p.Title)
	}
	if len(p.TestCases) != 1 {
		t.Errorf("TestCases: got %d, want 1", len(p.TestCases))
	}
}

func TestProblemRepo_GetByID_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id`).
		WithArgs("999").
		WillReturnRows(sqlmock.NewRows(problemCols))

	repo := NewProblemRepo(db)
	_, ok := repo.GetByID("999")
	if ok {
		t.Error("expected not found")
	}
}

// --- ListAssigned ---

func TestProblemRepo_ListAssigned_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT p.id, p.title`).
		WithArgs("u1").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "difficulty", "description", "time_limit_ms"}).
			AddRow("100001", "Two Sum", "Easy", "desc", 5000))
	mock.ExpectQuery(`SELECT input, expected_output`).
		WillReturnRows(sqlmock.NewRows([]string{"input", "expected_output", "is_hidden"}))

	repo := NewProblemRepo(db)
	probs := repo.ListAssigned("u1")
	if len(probs) != 1 {
		t.Errorf("got %d, want 1", len(probs))
	}
}

func TestProblemRepo_ListAssigned_Empty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT p.id, p.title`).
		WithArgs("u2").
		WillReturnRows(sqlmock.NewRows([]string{"id", "title", "difficulty", "description", "time_limit_ms"}))

	repo := NewProblemRepo(db)
	probs := repo.ListAssigned("u2")
	if len(probs) != 0 {
		t.Errorf("expected empty, got %d", len(probs))
	}
}

// --- Delete ---

func TestProblemRepo_Delete_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`DELETE FROM problems`).
		WithArgs("100001").
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewProblemRepo(db)
	if err := repo.Delete("100001"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemRepo_Delete_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`DELETE FROM problems`).
		WithArgs("999").
		WillReturnResult(sqlmock.NewResult(0, 0))

	repo := NewProblemRepo(db)
	if err := repo.Delete("999"); err == nil {
		t.Error("expected error for not-found delete")
	}
}

func TestProblemRepo_Delete_DBError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`DELETE FROM problems`).WillReturnError(errDuplicate)

	repo := NewProblemRepo(db)
	if err := repo.Delete("100001"); err == nil {
		t.Error("expected error")
	}
}

// --- Assign / Unassign ---

func TestProblemRepo_Assign_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`INSERT INTO user_problem_assignments`).
		WithArgs("u1", "p1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewProblemRepo(db)
	if err := repo.Assign("u1", "p1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemRepo_Unassign_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectExec(`DELETE FROM user_problem_assignments`).
		WithArgs("u1", "p1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	repo := NewProblemRepo(db)
	if err := repo.Unassign("u1", "p1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

// --- GetAssignedProblemIDs ---

func TestProblemRepo_GetAssignedProblemIDs_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT problem_id FROM user_problem_assignments`).
		WithArgs("u1").
		WillReturnRows(sqlmock.NewRows([]string{"problem_id"}).AddRow("p1").AddRow("p2"))

	repo := NewProblemRepo(db)
	ids := repo.GetAssignedProblemIDs("u1")
	if len(ids) != 2 {
		t.Errorf("got %d ids, want 2", len(ids))
	}
}

func TestProblemRepo_GetAssignedProblemIDs_Empty(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT problem_id FROM user_problem_assignments`).
		WithArgs("u99").
		WillReturnRows(sqlmock.NewRows([]string{"problem_id"}))

	repo := NewProblemRepo(db)
	ids := repo.GetAssignedProblemIDs("u99")
	if len(ids) != 0 {
		t.Errorf("expected empty, got %d", len(ids))
	}
}

// --- Create (transaction test) ---

func TestProblemRepo_Create_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO problems`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("123456"))
	mock.ExpectExec(`INSERT INTO test_cases`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	repo := NewProblemRepo(db)
	p := &domain.Problem{
		Title:       "Two Sum",
		Difficulty:  "Easy",
		Description: "Find two numbers",
		TestCases:   []domain.TestCase{{Input: "[2,7]", ExpectedOutput: "[0,1]"}},
	}
	if err := repo.Create(p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if p.ID == 0 {
		t.Error("expected problem ID to be set after create")
	}
}

func TestProblemRepo_Create_BeginTxError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin().WillReturnError(errDuplicate)

	repo := NewProblemRepo(db)
	if err := repo.Create(&domain.Problem{Title: "T"}); err == nil {
		t.Error("expected error on begin tx")
	}
}

func TestProblemRepo_Create_InsertProblemError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO problems`).WillReturnError(errDuplicate)
	mock.ExpectRollback()

	repo := NewProblemRepo(db)
	if err := repo.Create(&domain.Problem{Title: "T"}); err == nil {
		t.Error("expected error on insert problem")
	}
}

// --- Update (transaction test) ---

func TestProblemRepo_Update_Success(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE problems SET title`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(`DELETE FROM test_cases`).
		WillReturnResult(sqlmock.NewResult(1, 2))
	mock.ExpectCommit()

	repo := NewProblemRepo(db)
	p := &domain.Problem{Title: "Updated", Difficulty: "Medium", Description: "new desc"}
	if err := repo.Update("100001", p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemRepo_Update_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE problems SET title`).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectRollback()

	repo := NewProblemRepo(db)
	if err := repo.Update("999", &domain.Problem{Title: "T"}); err == nil {
		t.Error("expected error for not-found update")
	}
}

// --- TimeLimitMs ---

func TestProblemRepo_Create_CustomTimeLimitMs(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO problems`).
		WithArgs(
			sqlmock.AnyArg(),
			"Slow Problem",
			sqlmock.AnyArg(),
			"desc",
			int32(3000),
			int32(262144),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("111111"))
	mock.ExpectCommit()

	repo := NewProblemRepo(db)
	p := &domain.Problem{Title: "Slow Problem", Description: "desc", TimeLimitMs: 3000}
	if err := repo.Create(p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}

func TestProblemRepo_Create_DefaultTimeLimitMs(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO problems`).
		WithArgs(
			sqlmock.AnyArg(),
			"Default TL",
			sqlmock.AnyArg(),
			"desc",
			int32(5000),
			int32(262144),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("222222"))
	mock.ExpectCommit()

	repo := NewProblemRepo(db)
	p := &domain.Problem{Title: "Default TL", Description: "desc", TimeLimitMs: 0}
	if err := repo.Create(p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}

func TestProblemRepo_GetByID_ReturnsTimeLimitMs(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	mock.ExpectQuery(`SELECT id, title, difficulty, description, time_limit_ms FROM problems WHERE id`).
		WithArgs("100001").
		WillReturnRows(
			sqlmock.NewRows(problemCols).AddRow("100001", "Hard Problem", "Hard", "desc", 7000),
		)
	mock.ExpectQuery(`SELECT input, expected_output`).
		WillReturnRows(sqlmock.NewRows([]string{"input", "expected_output", "is_hidden"}))

	repo := NewProblemRepo(db)
	p, ok := repo.GetByID("100001")
	if !ok {
		t.Fatal("expected found")
	}
	if p.TimeLimitMs != 7000 {
		t.Errorf("TimeLimitMs: got %d, want 7000", p.TimeLimitMs)
	}
}
