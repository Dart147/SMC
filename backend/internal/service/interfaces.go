package service

import (
	"context"
	"time"

	sqlcdb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/repository"
)

type userRepo interface {
	GetUserByUsername(username string) (*repository.User, error)
	UpdateUserExamStartedAt(userID string, startedAt time.Time) error
	CreateUser(id, username, passwordHash, role string) error
}

type examRepo interface {
	StartExam(userID string) (time.Time, error)
	IncrementWarning(userID string) (int, error)
	EndExam(userID string) (time.Time, error)
}

type problemRepo interface {
	Create(prob *domain.Problem) error
	List() []domain.Problem
	GetByID(id string) (domain.Problem, bool)
	ListAssigned(userID string) []domain.Problem
	Delete(id string) error
	Update(id string, prob *domain.Problem) error
	Assign(userID, problemID string) error
	Unassign(userID, problemID string) error
	GetAssignedProblemIDs(userID string) []string
}

type submissionRepo interface {
	Save(s domain.Submission) error
	Update(s domain.Submission) error
	GetByID(id string) (domain.Submission, bool)
	List() []domain.Submission
	GetLatestByProblem(problemID string) (domain.Submission, bool)
	ClaimNext(ctx context.Context) (*domain.Submission, error)
	ListByUserID(userID string) []domain.Submission
	GetReport(ctx context.Context, id string) (sqlcdb.GetSubmissionReportRow, error)
}

type reportRepo interface {
	GetCandidateScores() ([]domain.CandidateScore, error)
}
