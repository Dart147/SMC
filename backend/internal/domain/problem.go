package domain

type TestCase struct {
	Input          string `yaml:"input"`
	ExpectedOutput string `yaml:"expected_output"`
}

type Problem struct {
	ID          string     `json:"id"          yaml:"id"`
	Title       string     `json:"title"        yaml:"title"`
	Difficulty  string     `json:"difficulty"   yaml:"difficulty"`
	Description string     `json:"description"  yaml:"description"`
	TestCases   []TestCase `json:"testCases"    yaml:"test_cases"`
}
