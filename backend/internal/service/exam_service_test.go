package service

import (
	"errors"
	"testing"
	"time"
)

type mockExamRepo struct {
	startTime    time.Time
	startErr     error
	warnCount    int
	warnErr      error
	endTime      time.Time
	endErr       error
	endCallCount int
}

func (m *mockExamRepo) StartExam(userID string) (time.Time, error) {
	return m.startTime, m.startErr
}
func (m *mockExamRepo) IncrementWarning(userID string) (int, error) {
	return m.warnCount, m.warnErr
}
func (m *mockExamRepo) EndExam(userID string) (time.Time, error) {
	m.endCallCount++
	return m.endTime, m.endErr
}

func TestExamService_StartExam_Success(t *testing.T) {
	now := time.Now()
	svc := NewExamService(&mockExamRepo{startTime: now})
	exp, err := svc.StartExam("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := now.Add(3 * time.Hour).Unix()
	if exp != expected {
		t.Errorf("expiresAt: got %d, want %d", exp, expected)
	}
}

func TestExamService_StartExam_RepoError(t *testing.T) {
	svc := NewExamService(&mockExamRepo{startErr: errors.New("db error")})
	_, err := svc.StartExam("u1")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestExamService_ReportWarning_BelowThreshold(t *testing.T) {
	repo := &mockExamRepo{warnCount: 2}
	svc := NewExamService(repo)
	count, err := svc.ReportWarning("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 2 {
		t.Errorf("count: got %d, want 2", count)
	}
	if repo.endCallCount != 0 {
		t.Error("EndExam should not be called below threshold")
	}
}

func TestExamService_ReportWarning_AtThreshold_CallsEndExam(t *testing.T) {
	repo := &mockExamRepo{warnCount: 3, endTime: time.Now()}
	svc := NewExamService(repo)
	count, err := svc.ReportWarning("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 3 {
		t.Errorf("count: got %d, want 3", count)
	}
	if repo.endCallCount != 1 {
		t.Errorf("EndExam should be called once, called %d times", repo.endCallCount)
	}
}

func TestExamService_ReportWarning_AboveThreshold_CallsEndExam(t *testing.T) {
	repo := &mockExamRepo{warnCount: 5, endTime: time.Now()}
	svc := NewExamService(repo)
	_, err := svc.ReportWarning("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.endCallCount != 1 {
		t.Errorf("EndExam should be called once, called %d times", repo.endCallCount)
	}
}

func TestExamService_ReportWarning_IncrementError(t *testing.T) {
	svc := NewExamService(&mockExamRepo{warnErr: errors.New("db error")})
	_, err := svc.ReportWarning("u1")
	if err == nil {
		t.Fatal("expected error from IncrementWarning")
	}
}

func TestExamService_ReportWarning_EndExamError_StillReturnsCount(t *testing.T) {
	// EndExam error should be logged but not surfaced to caller
	repo := &mockExamRepo{warnCount: 3, endErr: errors.New("end failed")}
	svc := NewExamService(repo)
	count, err := svc.ReportWarning("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 3 {
		t.Errorf("count: got %d, want 3", count)
	}
}

func TestExamService_EndExam_Success(t *testing.T) {
	expected := time.Now()
	svc := NewExamService(&mockExamRepo{endTime: expected})
	got, err := svc.EndExam("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.Equal(expected) {
		t.Errorf("endTime: got %v, want %v", got, expected)
	}
}

func TestExamService_EndExam_RepoError(t *testing.T) {
	svc := NewExamService(&mockExamRepo{endErr: errors.New("db error")})
	_, err := svc.EndExam("u1")
	if err == nil {
		t.Fatal("expected error")
	}
}
