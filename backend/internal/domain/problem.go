package domain

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	IsHidden       bool   `json:"-"`
}

type Problem struct {
	ID          int        `json:"id"`
	Title       string     `json:"title"`
	Difficulty  string     `json:"difficulty"`
	Description string     `json:"description"`
	TestCases   []TestCase `json:"testCases"`
	TimeLimitMs int        `json:"timeLimitMs"`
}

func (p Problem) ForDisplay() Problem {
	out := p
	out.TestCases = nil
	for _, tc := range p.TestCases {
		if !tc.IsHidden {
			out.TestCases = append(out.TestCases, tc)
		}
	}
	return out
}

func (p Problem) FirstSample() (TestCase, bool) {
	for _, tc := range p.TestCases {
		if !tc.IsHidden {
			return tc, true
		}
	}
	return TestCase{}, false
}
