package repository

import (
	"fmt"
	"sync"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type SubmissionRepo struct {
	mu   sync.RWMutex
	data map[string]domain.Submission
}

func NewSubmissionRepo() *SubmissionRepo {
	return &SubmissionRepo{data: make(map[string]domain.Submission)}
}

func (r *SubmissionRepo) Save(s domain.Submission) error {
	if s.ID == "" {
		return fmt.Errorf("submission ID must not be empty")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.data[s.ID] = s
	return nil
}

func (r *SubmissionRepo) GetByID(id string) (domain.Submission, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	s, ok := r.data[id]
	return s, ok
}

func (r *SubmissionRepo) Update(s domain.Submission) error {
	if s.ID == "" {
		return fmt.Errorf("submission ID must not be empty")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.data[s.ID]; !ok {
		return fmt.Errorf("submission %q not found", s.ID)
	}
	r.data[s.ID] = s
	return nil
}
