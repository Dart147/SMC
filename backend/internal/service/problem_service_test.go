package service

import (
	"errors"
	"testing"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type mockProblemRepo struct {
	createErr   error
	list        []domain.Problem
	prob        domain.Problem
	found       bool
	deleteErr   error
	updateErr   error
	assignErr   error
	unassignErr error
	assignedIDs []string
}

func (m *mockProblemRepo) Create(prob *domain.Problem) error { return m.createErr }
func (m *mockProblemRepo) List() []domain.Problem            { return m.list }
func (m *mockProblemRepo) GetByID(id string) (domain.Problem, bool) {
	return m.prob, m.found
}
func (m *mockProblemRepo) ListAssigned(userID string) []domain.Problem { return m.list }
func (m *mockProblemRepo) Delete(id string) error                      { return m.deleteErr }
func (m *mockProblemRepo) Update(id string, prob *domain.Problem) error {
	return m.updateErr
}
func (m *mockProblemRepo) Assign(userID, problemID string) error   { return m.assignErr }
func (m *mockProblemRepo) Unassign(userID, problemID string) error { return m.unassignErr }
func (m *mockProblemRepo) GetAssignedProblemIDs(userID string) []string {
	return m.assignedIDs
}

func TestProblemService_Create_Success(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{})
	p := &domain.Problem{Title: "Two Sum"}
	if err := svc.Create(p); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemService_Create_Error(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{createErr: errors.New("db error")})
	if err := svc.Create(&domain.Problem{}); err == nil {
		t.Error("expected error")
	}
}

func TestProblemService_List(t *testing.T) {
	probs := []domain.Problem{{ID: 1, Title: "A"}, {ID: 2, Title: "B"}}
	svc := NewProblemService(&mockProblemRepo{list: probs})
	got := svc.List()
	if len(got) != 2 {
		t.Errorf("List: got %d, want 2", len(got))
	}
}

func TestProblemService_GetByID_Found(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{prob: domain.Problem{ID: 1, Title: "Two Sum"}, found: true})
	p, ok := svc.GetByID("1")
	if !ok {
		t.Fatal("expected found=true")
	}
	if p.Title != "Two Sum" {
		t.Errorf("Title: got %q, want 'Two Sum'", p.Title)
	}
}

func TestProblemService_GetByID_NotFound(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{found: false})
	_, ok := svc.GetByID("999")
	if ok {
		t.Error("expected found=false")
	}
}

func TestProblemService_ListAssigned(t *testing.T) {
	probs := []domain.Problem{{ID: 3, Title: "C"}}
	svc := NewProblemService(&mockProblemRepo{list: probs})
	got := svc.ListAssigned("user1")
	if len(got) != 1 {
		t.Errorf("ListAssigned: got %d, want 1", len(got))
	}
}

func TestProblemService_AssignProblem_Success(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{})
	if err := svc.AssignProblem("u1", "p1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemService_AssignProblem_Error(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{assignErr: errors.New("conflict")})
	if err := svc.AssignProblem("u1", "p1"); err == nil {
		t.Error("expected error")
	}
}

func TestProblemService_UnassignProblem_Success(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{})
	if err := svc.UnassignProblem("u1", "p1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemService_UnassignProblem_Error(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{unassignErr: errors.New("not found")})
	if err := svc.UnassignProblem("u1", "p1"); err == nil {
		t.Error("expected error")
	}
}

func TestProblemService_Delete_Success(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{})
	if err := svc.Delete("1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemService_Delete_Error(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{deleteErr: errors.New("not found")})
	if err := svc.Delete("999"); err == nil {
		t.Error("expected error")
	}
}

func TestProblemService_Update_Success(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{})
	if err := svc.Update("1", &domain.Problem{Title: "Updated"}); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestProblemService_Update_Error(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{updateErr: errors.New("db error")})
	if err := svc.Update("1", &domain.Problem{}); err == nil {
		t.Error("expected error")
	}
}

func TestProblemService_GetAssignedProblemIDs(t *testing.T) {
	svc := NewProblemService(&mockProblemRepo{assignedIDs: []string{"p1", "p2"}})
	ids := svc.GetAssignedProblemIDs("u1")
	if len(ids) != 2 {
		t.Errorf("got %d ids, want 2", len(ids))
	}
}
