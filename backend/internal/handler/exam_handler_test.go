package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type mockExamService struct {
	expiresAt    int64
	startErr     error
	warningCount int
	warnErr      error
	endedAt      time.Time
	endErr       error
}

func (m *mockExamService) StartExam(userID string) (int64, error) {
	return m.expiresAt, m.startErr
}
func (m *mockExamService) ReportWarning(userID string) (int, error) {
	return m.warningCount, m.warnErr
}
func (m *mockExamService) EndExam(userID string) (time.Time, error) {
	return m.endedAt, m.endErr
}

// --- StartExam ---

func TestExamHandler_StartExam_OK(t *testing.T) {
	svc := &mockExamService{expiresAt: 9999999}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/exams/start", nil), "u1")
	h.StartExam(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("StartExam OK: got %d, want 200", w.Code)
	}
}

func TestExamHandler_StartExam_Unauthorized(t *testing.T) {
	svc := &mockExamService{}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/exams/start", nil)
	h.StartExam(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("StartExam unauthorized: got %d, want 401", w.Code)
	}
}

func TestExamHandler_StartExam_ServiceError(t *testing.T) {
	svc := &mockExamService{startErr: errors.New("db error")}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/exams/start", nil), "u1")
	h.StartExam(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("StartExam error: got %d, want 500", w.Code)
	}
}

// --- ReportWarning ---

func TestExamHandler_ReportWarning_OK(t *testing.T) {
	svc := &mockExamService{warningCount: 1}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/exams/warn", nil), "u1")
	h.ReportWarning(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("ReportWarning OK: got %d, want 200", w.Code)
	}
}

func TestExamHandler_ReportWarning_Unauthorized(t *testing.T) {
	svc := &mockExamService{}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/exams/warn", nil)
	h.ReportWarning(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("ReportWarning unauthorized: got %d, want 401", w.Code)
	}
}

func TestExamHandler_ReportWarning_ServiceError(t *testing.T) {
	svc := &mockExamService{warnErr: errors.New("fail")}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/exams/warn", nil), "u1")
	h.ReportWarning(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("ReportWarning error: got %d, want 500", w.Code)
	}
}

// --- EndExam ---

func TestExamHandler_EndExam_OK(t *testing.T) {
	svc := &mockExamService{endedAt: time.Now()}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/exams/end", nil), "u1")
	h.EndExam(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("EndExam OK: got %d, want 200", w.Code)
	}
}

func TestExamHandler_EndExam_Unauthorized(t *testing.T) {
	svc := &mockExamService{}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/exams/end", nil)
	h.EndExam(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("EndExam unauthorized: got %d, want 401", w.Code)
	}
}

func TestExamHandler_EndExam_ServiceError(t *testing.T) {
	svc := &mockExamService{endErr: errors.New("db error")}
	h := NewExamHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/exams/end", nil), "u1")
	h.EndExam(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("EndExam error: got %d, want 500", w.Code)
	}
}
