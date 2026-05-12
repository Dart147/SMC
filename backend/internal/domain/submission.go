package domain

const (
	StatusPending            = "Pending"
	StatusAccepted           = "Accepted"
	StatusWrongAnswer        = "Wrong Answer"
	StatusTimeLimitExceeded  = "Time Limit Exceeded"
)

type Submission struct {
	ID        string `json:"id"`
	ProblemID string `json:"problemId"`
	Code      string `json:"code"`
	Language  string `json:"language"`
	Status    string `json:"status"`
}
