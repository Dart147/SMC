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
}
