package repository

import (
	"fmt"
	"os"

	"github.com/Dart147/SMC/backend/internal/domain"
	"gopkg.in/yaml.v3"
)

type ProblemRepo struct {
	problems []domain.Problem
	index    map[string]domain.Problem
}

func NewProblemRepo(seedFile string) (*ProblemRepo, error) {
	data, err := os.ReadFile(seedFile)
	if err != nil {
		return nil, fmt.Errorf("read seed file %q: %w", seedFile, err)
	}

	var problems []domain.Problem
	if err := yaml.Unmarshal(data, &problems); err != nil {
		return nil, fmt.Errorf("parse seed file: %w", err)
	}

	index := make(map[string]domain.Problem, len(problems))
	for _, p := range problems {
		index[p.ID] = p
	}

	return &ProblemRepo{problems: problems, index: index}, nil
}

func (r *ProblemRepo) List() []domain.Problem {
	return r.problems
}

func (r *ProblemRepo) GetByID(id string) (domain.Problem, bool) {
	p, ok := r.index[id]
	return p, ok
}
