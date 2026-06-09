package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/judge"
)

type mockSubmissionService struct {
	submission   domain.Submission
	found        bool
	submissions  []domain.Submission
	sampleResult judge.Result
	sampleErr    error
	createErr    error
	report       interface{}
	reportErr    error
}

func (m *mockSubmissionService) Create(problemID, code, language, userID string) (domain.Submission, error) {
	return m.submission, m.createErr
}
func (m *mockSubmissionService) GetByID(id string) (domain.Submission, bool) {
	return m.submission, m.found
}
func (m *mockSubmissionService) ListByUserID(userID string) []domain.Submission {
	return m.submissions
}
func (m *mockSubmissionService) GetLatestByProblem(problemID string) (domain.Submission, bool) {
	return m.submission, m.found
}
func (m *mockSubmissionService) RunSample(ctx context.Context, problemID, code, language string) (judge.Result, error) {
	return m.sampleResult, m.sampleErr
}
func (m *mockSubmissionService) GetReportByID(id string) (interface{}, error) {
	return m.report, m.reportErr
}

// --- Create ---

func TestSubmissionHandler_Create_OK(t *testing.T) {
	svc := &mockSubmissionService{
		submission: domain.Submission{ID: "abc", Status: domain.StatusPending},
	}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"problemId": "1", "code": "print(1)", "language": "python"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/submissions", bytes.NewReader(body)), "user-1")
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("Create OK: got %d, want 201", w.Code)
	}
}

func TestSubmissionHandler_Create_Unauthorized(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"problemId": "1", "code": "x", "language": "go"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/submissions", bytes.NewReader(body))
	h.Create(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Create unauthorized: got %d, want 401", w.Code)
	}
}

func TestSubmissionHandler_Create_MissingFields(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"problemId": "1"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/submissions", bytes.NewReader(body)), "u1")
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Create missing fields: got %d, want 400", w.Code)
	}
}

func TestSubmissionHandler_Create_BadJSON(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/submissions", bytes.NewBufferString("bad")), "u1")
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Create bad JSON: got %d, want 400", w.Code)
	}
}

func TestSubmissionHandler_Create_ServiceError(t *testing.T) {
	svc := &mockSubmissionService{createErr: errors.New("db error")}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"problemId": "1", "code": "x", "language": "go"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodPost, "/api/submissions", bytes.NewReader(body)), "u1")
	h.Create(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Create service error: got %d, want 500", w.Code)
	}
}

// --- GetByID ---

func TestSubmissionHandler_GetByID_OK(t *testing.T) {
	svc := &mockSubmissionService{
		submission: domain.Submission{ID: "s1", UserID: "user-1"},
		found:      true,
	}
	h := NewSubmissionHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/submissions/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions/s1", nil), "user-1")
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetByID OK: got %d, want 200", w.Code)
	}
}

func TestSubmissionHandler_GetByID_Unauthorized(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/submissions/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/submissions/s1", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("GetByID unauthorized: got %d, want 401", w.Code)
	}
}

func TestSubmissionHandler_GetByID_NotFound(t *testing.T) {
	svc := &mockSubmissionService{found: false}
	h := NewSubmissionHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/submissions/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions/nope", nil), "u1")
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("GetByID not found: got %d, want 404", w.Code)
	}
}

func TestSubmissionHandler_GetByID_Forbidden(t *testing.T) {
	svc := &mockSubmissionService{
		submission: domain.Submission{ID: "s1", UserID: "other-user"},
		found:      true,
	}
	h := NewSubmissionHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/submissions/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions/s1", nil), "user-1")
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("GetByID forbidden: got %d, want 403", w.Code)
	}
}

// --- List ---

func TestSubmissionHandler_List_OK(t *testing.T) {
	svc := &mockSubmissionService{
		submissions: []domain.Submission{{ID: "s1", UserID: "u1"}},
	}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions", nil), "u1")
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("List OK: got %d, want 200", w.Code)
	}
}

func TestSubmissionHandler_List_Unauthorized(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/submissions", nil)
	h.List(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("List unauthorized: got %d, want 401", w.Code)
	}
}

// --- GetLatest ---

func TestSubmissionHandler_GetLatest_OK(t *testing.T) {
	svc := &mockSubmissionService{
		submission: domain.Submission{ID: "s1", UserID: "u1"},
		found:      true,
	}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions/latest?problemId=1", nil), "u1")
	h.GetLatest(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetLatest OK: got %d, want 200", w.Code)
	}
}

func TestSubmissionHandler_GetLatest_MissingProblemID(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions/latest", nil), "u1")
	h.GetLatest(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("GetLatest missing problemId: got %d, want 400", w.Code)
	}
}

func TestSubmissionHandler_GetLatest_NotFound(t *testing.T) {
	svc := &mockSubmissionService{found: false}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/submissions/latest?problemId=1", nil), "u1")
	h.GetLatest(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("GetLatest not found: got %d, want 404", w.Code)
	}
}

func TestSubmissionHandler_GetLatest_Unauthorized(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/submissions/latest?problemId=1", nil)
	h.GetLatest(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("GetLatest unauthorized: got %d, want 401", w.Code)
	}
}

// --- ListByUserID (admin) ---

func TestSubmissionHandler_ListByUserID_OK(t *testing.T) {
	svc := &mockSubmissionService{submissions: []domain.Submission{{ID: "s1"}}}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/submissions?userId=u1", nil)
	h.ListByUserID(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("ListByUserID OK: got %d, want 200", w.Code)
	}
}

func TestSubmissionHandler_ListByUserID_MissingUserID(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/submissions", nil)
	h.ListByUserID(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("ListByUserID missing userId: got %d, want 400", w.Code)
	}
}

// --- RunSample ---

func TestSubmissionHandler_RunSample_OK(t *testing.T) {
	svc := &mockSubmissionService{
		sampleResult: judge.Result{Status: domain.StatusAccepted, Output: "0 1\n"},
	}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"problemId": "1", "code": "x", "language": "go"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/run", bytes.NewReader(body))
	h.RunSample(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("RunSample OK: got %d, want 200", w.Code)
	}
}

func TestSubmissionHandler_RunSample_ServiceError(t *testing.T) {
	svc := &mockSubmissionService{sampleErr: errors.New("no sample")}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"problemId": "1", "code": "x", "language": "go"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/run", bytes.NewReader(body))
	h.RunSample(w, r)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("RunSample error: got %d, want 422", w.Code)
	}
}

func TestSubmissionHandler_RunSample_MissingFields(t *testing.T) {
	svc := &mockSubmissionService{}
	h := NewSubmissionHandler(svc)

	payload := map[string]string{"code": "x"}
	body, _ := json.Marshal(payload)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/run", bytes.NewReader(body))
	h.RunSample(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("RunSample missing fields: got %d, want 400", w.Code)
	}
}

// --- GetReport ---

func TestSubmissionHandler_GetReport_OK(t *testing.T) {
	svc := &mockSubmissionService{report: map[string]string{"id": "s1"}}
	h := NewSubmissionHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/submissions/{id}/report", h.GetReport)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/submissions/s1/report", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetReport OK: got %d, want 200", w.Code)
	}
}

func TestSubmissionHandler_GetReport_NotFound(t *testing.T) {
	svc := &mockSubmissionService{reportErr: errors.New("not found")}
	h := NewSubmissionHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/submissions/{id}/report", h.GetReport)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/submissions/999/report", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("GetReport not found: got %d, want 404", w.Code)
	}
}
