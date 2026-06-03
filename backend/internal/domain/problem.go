package domain

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	IsHidden       bool   `json:"-"` // internal only — never serialized to clients
}

type Problem struct {
	ID          int        `json:"id"`
	Title       string     `json:"title"`
	Difficulty  string     `json:"difficulty"`
	Description string     `json:"description"`
	TestCases   []TestCase `json:"testCases"`
}

// ForDisplay returns a copy of the problem with hidden test cases stripped.
// Use this before encoding a problem in any candidate-facing API response.
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

// FirstSample returns the first non-hidden test case and whether one exists.
func (p Problem) FirstSample() (TestCase, bool) {
	for _, tc := range p.TestCases {
		if !tc.IsHidden {
			return tc, true
		}
	}
	return TestCase{}, false
}
