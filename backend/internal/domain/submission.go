package domain

const (
    StatusPending             = "Pending"
    StatusJudging             = "Judging"
    StatusAccepted            = "Accepted"
    StatusWrongAnswer         = "Wrong Answer"
    StatusTimeLimitExceeded   = "Time Limit Exceeded"
    StatusMemoryLimitExceeded = "Memory Limit Exceeded"
    StatusRuntimeError        = "Runtime Error"
    StatusCompileError        = "Compile Error"
)

type Submission struct {
    ID              string   `json:"id"`
    ProblemID       string   `json:"problemId"`
    UserID          string   `json:"userId"`
    Code            string   `json:"code"`
    Language        string   `json:"language"`
    Status          string   `json:"status"`
    Output          string   `json:"output,omitempty"`
    ExpectedOutput  string   `json:"expectedOutput,omitempty"`
    Error           string   `json:"error,omitempty"`
    PassedTestCases int      `json:"passedTestCases"`
    TotalTestCases  int      `json:"totalTestCases"`
    Score           int      `json:"score"`           // 最終分數
    Duration        int      `json:"duration"`        // 耗時 (秒)
    Violations      []string `json:"violations"`      // 違規事件紀錄
    
    // 🌟 補上這行，讓 Service 層可以存入格式化後的 "1/1" 字串
    TestCases       string   `json:"testCases"`       
}