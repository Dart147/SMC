//go:build integration

package repository_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"

	_ "github.com/lib/pq"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/repository"
	"go.uber.org/zap"
)

// testDB is shared across all tests in this package.
var testDB *sql.DB

func TestMain(m *testing.M) {
	url := os.Getenv("TEST_DB_URL")
	if url == "" {
		fmt.Println("SKIP: TEST_DB_URL not set — skipping integration tests")
		os.Exit(0)
	}

	db, err := sql.Open("postgres", url)
	if err != nil {
		panic("open db: " + err.Error())
	}
	if err := db.Ping(); err != nil {
		panic("ping db: " + err.Error())
	}
	testDB = db
	defer db.Close()

	applySchemaIfNeeded(db)
	os.Exit(m.Run())
}

// applySchemaIfNeeded creates tables if they do not already exist.
// This lets TestMain be idempotent across runs against the same DB.
func applySchemaIfNeeded(db *sql.DB) {
	var exists bool
	db.QueryRow(
		"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'submissions')",
	).Scan(&exists)
	if exists {
		return
	}
	// Path is relative to this file's package directory (backend/internal/repository).
	schema, err := os.ReadFile("../../db/init.sql")
	if err != nil {
		panic("read init.sql: " + err.Error())
	}
	if _, err := db.Exec(string(schema)); err != nil {
		panic("apply schema: " + err.Error())
	}
}

// truncateSubmissions removes all rows from the submissions table before each test.
func truncateSubmissions(t *testing.T) {
	t.Helper()
	if _, err := testDB.Exec("TRUNCATE submissions"); err != nil {
		t.Fatalf("truncate submissions: %v", err)
	}
}

// newTestSub returns a minimal domain.Submission suitable for inserting via Save.
func newTestSub(id string) domain.Submission {
	return domain.Submission{
		ID:       id,
		Code:     "print('test')",
		Language: "python",
		Status:   domain.StatusPending,
	}
}

// saveOrFail saves a submission and fails the test on error.
func saveOrFail(t *testing.T, repo *repository.SubmissionRepo, id string) {
	t.Helper()
	if err := repo.Save(newTestSub(id)); err != nil {
		t.Fatalf("save %q: %v", id, err)
	}
}

// ---- Tests ----

func TestClaimNext_EmptyQueueReturnsNil(t *testing.T) {
	truncateSubmissions(t)
	repo := repository.NewSubmissionRepo(testDB, zap.NewNop())

	sub, err := repo.ClaimNext(context.Background())

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub != nil {
		t.Fatalf("expected nil for empty queue, got submission %q", sub.ID)
	}
}

func TestClaimNext_ClaimsPendingAndSetsJudging(t *testing.T) {
	truncateSubmissions(t)
	repo := repository.NewSubmissionRepo(testDB, zap.NewNop())
	saveOrFail(t, repo, "sub-1")

	sub, err := repo.ClaimNext(context.Background())

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if sub == nil {
		t.Fatal("expected a submission, got nil")
	}
	if sub.ID != "sub-1" {
		t.Errorf("ID: got %q, want %q", sub.ID, "sub-1")
	}
	if sub.Status != domain.StatusJudging {
		t.Errorf("returned status: got %q, want %q", sub.Status, domain.StatusJudging)
	}

	// Verify the row in the DB was also updated.
	stored, ok := repo.GetByID("sub-1")
	if !ok {
		t.Fatal("submission not found after claim")
	}
	if stored.Status != domain.StatusJudging {
		t.Errorf("DB status: got %q, want %q", stored.Status, domain.StatusJudging)
	}
}

// TestClaimNext_TwoWorkersDifferentRows ensures two concurrent claims
// each get a distinct row — the core SKIP LOCKED guarantee.
func TestClaimNext_TwoWorkersDifferentRows(t *testing.T) {
	truncateSubmissions(t)
	repo := repository.NewSubmissionRepo(testDB, zap.NewNop())
	saveOrFail(t, repo, "sub-a")
	saveOrFail(t, repo, "sub-b")

	type result struct {
		sub *domain.Submission
		err error
	}
	ch := make(chan result, 2)

	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sub, err := repo.ClaimNext(context.Background())
			ch <- result{sub, err}
		}()
	}
	wg.Wait()
	close(ch)

	var ids []string
	for r := range ch {
		if r.err != nil {
			t.Fatalf("unexpected error: %v", r.err)
		}
		if r.sub == nil {
			t.Fatal("expected a submission, got nil")
		}
		ids = append(ids, r.sub.ID)
	}

	if len(ids) != 2 {
		t.Fatalf("expected 2 claims, got %d", len(ids))
	}
	if ids[0] == ids[1] {
		t.Errorf("both workers claimed the same submission %q (SKIP LOCKED failed)", ids[0])
	}
}

func TestRecoverStalled_ResetsJudgingToPending(t *testing.T) {
	truncateSubmissions(t)
	repo := repository.NewSubmissionRepo(testDB, zap.NewNop())
	saveOrFail(t, repo, "sub-stalled")

	// Simulate a crash: claim the submission (sets Judging) but never finish it.
	claimed, err := repo.ClaimNext(context.Background())
	if err != nil || claimed == nil {
		t.Fatalf("setup: claim failed: err=%v, sub=%v", err, claimed)
	}

	// RecoverStalled should reset it back to Pending.
	if err := repo.RecoverStalled(context.Background()); err != nil {
		t.Fatalf("RecoverStalled: %v", err)
	}

	sub, ok := repo.GetByID("sub-stalled")
	if !ok {
		t.Fatal("submission not found after recovery")
	}
	if sub.Status != domain.StatusPending {
		t.Errorf("status after recovery: got %q, want %q", sub.Status, domain.StatusPending)
	}
}

func TestRecoverStalled_IgnoresFinalStatuses(t *testing.T) {
	truncateSubmissions(t)
	repo := repository.NewSubmissionRepo(testDB, zap.NewNop())

	finals := []string{
		domain.StatusAccepted,
		domain.StatusWrongAnswer,
		domain.StatusRuntimeError,
		domain.StatusCompileError,
		domain.StatusTimeLimitExceeded,
	}

	for _, status := range finals {
		sub := newTestSub("sub-" + status)
		sub.Status = status
		if err := repo.Save(sub); err != nil {
			t.Fatalf("save %q: %v", status, err)
		}
	}

	if err := repo.RecoverStalled(context.Background()); err != nil {
		t.Fatalf("RecoverStalled: %v", err)
	}

	for _, status := range finals {
		sub, ok := repo.GetByID("sub-" + status)
		if !ok {
			t.Fatalf("submission %q not found", status)
		}
		if sub.Status != status {
			t.Errorf("RecoverStalled modified %q submission (now %q)", status, sub.Status)
		}
	}
}
