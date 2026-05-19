package domain

const (
	StatusPending             = "Pending"
	StatusAccepted            = "Accepted"
	StatusWrongAnswer         = "Wrong Answer"
	StatusTimeLimitExceeded   = "Time Limit Exceeded"
	StatusMemoryLimitExceeded = "Memory Limit Exceeded"
	StatusRuntimeError        = "Runtime Error"
	StatusCompileError        = "Compile Error"
)

type Submission struct {
	ID              string `json:"id"`
	ProblemID       string `json:"problemId"`
	Code            string `json:"code"`
	Language        string `json:"language"`
	Status          string `json:"status"`
	Output          string `json:"output,omitempty"`
	ExpectedOutput  string `json:"expectedOutput,omitempty"`
	Error           string `json:"error,omitempty"`
	PassedTestCases int    `json:"passedTestCases"`
	TotalTestCases  int    `json:"totalTestCases"`
}
