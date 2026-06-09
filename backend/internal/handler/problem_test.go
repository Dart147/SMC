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
	"github.com/Dart147/SMC/backend/internal/middleware"
)

// mockProblemService is a configurable stub for unit tests.
type mockProblemService struct {
	createErr  error
	listResult []domain.Problem
	problem    domain.Problem
	found      bool
	deleteErr  error
	updateErr  error
	assignErr  error
	assignIDs  []string
}

func (m *mockProblemService) Create(prob *domain.Problem) error { return m.createErr }
func (m *mockProblemService) List() []domain.Problem            { return m.listResult }
func (m *mockProblemService) GetByID(id string) (domain.Problem, bool) {
	return m.problem, m.found
}
func (m *mockProblemService) Delete(id string) error { return m.deleteErr }
func (m *mockProblemService) Update(id string, prob *domain.Problem) error {
	return m.updateErr
}
func (m *mockProblemService) ListAssigned(userID string) []domain.Problem  { return m.listResult }
func (m *mockProblemService) AssignProblem(userID, problemID string) error { return m.assignErr }
func (m *mockProblemService) UnassignProblem(userID, problemID string) error {
	return m.assignErr
}
func (m *mockProblemService) GetAssignedProblemIDs(userID string) []string { return m.assignIDs }

func withUserID(r *http.Request, userID string) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	return r.WithContext(ctx)
}

// --- List ---

func TestProblemHandler_List_OK(t *testing.T) {
	svc := &mockProblemService{listResult: []domain.Problem{{ID: 1, Title: "Two Sum"}}}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("List: got %d, want 200", w.Code)
	}
	var body []domain.Problem
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("List: invalid JSON: %v", err)
	}
	if len(body) != 1 || body[0].Title != "Two Sum" {
		t.Errorf("List: unexpected body %+v", body)
	}
}

func TestProblemHandler_List_Empty(t *testing.T) {
	svc := &mockProblemService{listResult: []domain.Problem{}}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("List empty: got %d, want 200", w.Code)
	}
}

// --- GetByID ---

func TestProblemHandler_GetByID_Found(t *testing.T) {
	svc := &mockProblemService{
		problem: domain.Problem{ID: 3, Title: "Longest Substring"},
		found:   true,
	}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/problems/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/problems/3", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetByID found: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_GetByID_NotFound(t *testing.T) {
	svc := &mockProblemService{found: false}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/problems/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/problems/999", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("GetByID not found: got %d, want 404", w.Code)
	}
}

// --- Create ---

func TestProblemHandler_Create_OK(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(domain.Problem{Title: "New Problem", Difficulty: "Easy"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/problems", bytes.NewReader(body))
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("Create OK: got %d, want 201", w.Code)
	}
}

func TestProblemHandler_Create_BadJSON(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/problems", bytes.NewBufferString("notjson"))
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Create bad JSON: got %d, want 400", w.Code)
	}
}

func TestProblemHandler_Create_ServiceError(t *testing.T) {
	svc := &mockProblemService{createErr: errors.New("db error")}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(domain.Problem{Title: "Problem"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/problems", bytes.NewReader(body))
	h.Create(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Create service error: got %d, want 500", w.Code)
	}
}

// --- Delete ---

func TestProblemHandler_Delete_OK(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("DELETE /api/problems/{id}", h.Delete)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/api/problems/1", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("Delete OK: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_Delete_NotFound(t *testing.T) {
	svc := &mockProblemService{deleteErr: errors.New("not found")}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("DELETE /api/problems/{id}", h.Delete)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/api/problems/999", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("Delete not found: got %d, want 404", w.Code)
	}
}

// --- Update ---

func TestProblemHandler_Update_OK(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	payload := map[string]interface{}{
		"title":      "Updated",
		"difficulty": "Hard",
		"testCases":  []interface{}{},
	}
	body, _ := json.Marshal(payload)

	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/problems/{id}", h.Update)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPut, "/api/problems/1", bytes.NewReader(body))
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("Update OK: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_Update_NotFound(t *testing.T) {
	svc := &mockProblemService{updateErr: errors.New("problem 999 not found")}
	h := NewProblemHandler(svc)

	payload := map[string]interface{}{"title": "X", "testCases": []interface{}{}}
	body, _ := json.Marshal(payload)

	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/problems/{id}", h.Update)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPut, "/api/problems/999", bytes.NewReader(body))
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("Update not found: got %d, want 404", w.Code)
	}
}

func TestProblemHandler_Update_BadJSON(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("PUT /api/problems/{id}", h.Update)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPut, "/api/problems/1", bytes.NewBufferString("bad"))
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Update bad JSON: got %d, want 400", w.Code)
	}
}

// --- GetByIDAdmin ---

func TestProblemHandler_GetByIDAdmin_Found(t *testing.T) {
	svc := &mockProblemService{
		problem: domain.Problem{
			ID: 1, Title: "T", Difficulty: "Easy",
			TestCases: []domain.TestCase{{Input: "a", ExpectedOutput: "b", IsHidden: true}},
		},
		found: true,
	}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/admin/problems/{id}", h.GetByIDAdmin)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/problems/1", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetByIDAdmin found: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_GetByIDAdmin_NotFound(t *testing.T) {
	svc := &mockProblemService{found: false}
	h := NewProblemHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/admin/problems/{id}", h.GetByIDAdmin)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/problems/999", nil)
	mux.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("GetByIDAdmin not found: got %d, want 404", w.Code)
	}
}

// --- ListMyProblems ---

func TestProblemHandler_ListMyProblems_Authorized(t *testing.T) {
	svc := &mockProblemService{listResult: []domain.Problem{{ID: 2, Title: "P2"}}}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := withUserID(httptest.NewRequest(http.MethodGet, "/api/my-problems", nil), "user-1")
	h.ListMyProblems(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("ListMyProblems authorized: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_ListMyProblems_Unauthorized(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/my-problems", nil)
	h.ListMyProblems(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("ListMyProblems unauthorized: got %d, want 401", w.Code)
	}
}

// --- AssignProblem ---

func TestProblemHandler_AssignProblem_OK(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]string{"userId": "u1", "problemId": "p1"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/admin/assign-problem", bytes.NewReader(body))
	h.AssignProblem(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("AssignProblem OK: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_AssignProblem_MissingFields(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]string{"userId": "u1"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/admin/assign-problem", bytes.NewReader(body))
	h.AssignProblem(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("AssignProblem missing: got %d, want 400", w.Code)
	}
}

func TestProblemHandler_AssignProblem_ServiceError(t *testing.T) {
	svc := &mockProblemService{assignErr: errors.New("db error")}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]string{"userId": "u1", "problemId": "p1"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/api/admin/assign-problem", bytes.NewReader(body))
	h.AssignProblem(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("AssignProblem service error: got %d, want 500", w.Code)
	}
}

// --- UnassignProblem ---

func TestProblemHandler_UnassignProblem_OK(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]string{"userId": "u1", "problemId": "p1"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/api/admin/assign-problem", bytes.NewReader(body))
	h.UnassignProblem(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("UnassignProblem OK: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_UnassignProblem_MissingFields(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	body, _ := json.Marshal(map[string]string{"problemId": "p1"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/api/admin/assign-problem", bytes.NewReader(body))
	h.UnassignProblem(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("UnassignProblem missing: got %d, want 400", w.Code)
	}
}

// --- GetCandidateAssignments ---

func TestProblemHandler_GetCandidateAssignments_OK(t *testing.T) {
	svc := &mockProblemService{assignIDs: []string{"p1", "p2"}}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/candidate-assignments?userId=u1", nil)
	h.GetCandidateAssignments(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("GetCandidateAssignments OK: got %d, want 200", w.Code)
	}
}

func TestProblemHandler_GetCandidateAssignments_MissingUserID(t *testing.T) {
	svc := &mockProblemService{}
	h := NewProblemHandler(svc)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/admin/candidate-assignments", nil)
	h.GetCandidateAssignments(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("GetCandidateAssignments missing userId: got %d, want 400", w.Code)
	}
}
