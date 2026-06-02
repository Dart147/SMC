package domain

import (
	"time"
)

type User struct {
	ID            string     `json:"id"`
	Username      string     `json:"username"`
	PasswordHash  string     `json:"-"`
	Role          string     `json:"role"`
	ExamStartedAt *time.Time `json:"exam_started_at"`
	WarningCount  int        `json:"warning_count"`
	IsSuspicious  bool       `json:"is_suspicious"`
}

// CandidateScore 管理台報表：每位考生的得分彙總
type CandidateScore struct {
	UserID            string     `json:"userId"`
	Username          string     `json:"username"`
	ExamStartedAt     *time.Time `json:"examStartedAt"`
	TotalScore        int        `json:"totalScore"`
	ProblemsAttempted int        `json:"problemsAttempted"`
	ProblemsAccepted  int        `json:"problemsAccepted"`
}
