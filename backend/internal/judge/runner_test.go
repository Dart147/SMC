package judge

import (
	"context"
	"os/exec"
	"testing"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

// sumProblem is a minimal two-integer addition problem used across all language tests.
var sumProblem = domain.Problem{
	ID:    1,
	Title: "sum",
	TestCases: []domain.TestCase{
		{Input: "1 2", ExpectedOutput: "3"},
		{Input: "10 20", ExpectedOutput: "30"},
		{Input: "-5 5", ExpectedOutput: "0"},
	},
}

var codeByLang = map[string]string{
	"python": "a, b = map(int, input().split())\nprint(a + b)\n",
	"javascript": `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split(/\s+/);
console.log(Number(lines[0]) + Number(lines[1]));`,
	"go": `package main
import "fmt"
func main() {
	var a, b int
	fmt.Scan(&a, &b)
	fmt.Println(a + b)
}`,
	"c": `#include <stdio.h>
int main() {
	int a, b;
	scanf("%d %d", &a, &b);
	printf("%d\n", a + b);
	return 0;
}`,
	"cpp": `#include <iostream>
using namespace std;
int main() {
	int a, b;
	cin >> a >> b;
	cout << a + b << endl;
	return 0;
}`,
}

var badCodeByLang = map[string]string{
	"c":   "#include <stdio.h>\nint main() { this is not valid C }",
	"cpp": "#include <iostream>\nint main() { this is not valid C++ }",
}

// ── ProcessRunner ────────────────────────────────────────────────────────────

func TestProcessRunner_C_Accepted(t *testing.T) {
	if _, err := exec.LookPath("gcc"); err != nil {
		t.Skip("gcc not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["c"], "c")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
	if res.PassedTestCases != res.TotalTestCases {
		t.Fatalf("want %d passed, got %d", res.TotalTestCases, res.PassedTestCases)
	}
}

func TestProcessRunner_C_CompileError(t *testing.T) {
	if _, err := exec.LookPath("gcc"); err != nil {
		t.Skip("gcc not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, badCodeByLang["c"], "c")
	if res.Status != domain.StatusCompileError {
		t.Fatalf("want Compile Error, got %q", res.Status)
	}
}

func TestProcessRunner_CPP_Accepted(t *testing.T) {
	if _, err := exec.LookPath("g++"); err != nil {
		t.Skip("g++ not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["cpp"], "cpp")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}

func TestProcessRunner_CPP_CompileError(t *testing.T) {
	if _, err := exec.LookPath("g++"); err != nil {
		t.Skip("g++ not found on PATH")
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)
	res := r.Run(context.Background(), sumProblem, badCodeByLang["cpp"], "cpp")
	if res.Status != domain.StatusCompileError {
		t.Fatalf("want Compile Error, got %q", res.Status)
	}
}

func TestProcessRunner_AllLanguages(t *testing.T) {
	prerequisites := map[string]string{
		"python":     "python3",
		"javascript": "node",
		"go":         "go",
		"c":          "gcc",
		"cpp":        "g++",
	}
	logger, _ := zap.NewDevelopment()
	r := NewProcessRunner(logger)

	for lang, code := range codeByLang {
		bin := prerequisites[lang]
		if _, err := exec.LookPath(bin); err != nil {
			t.Logf("skipping %s: %s not found", lang, bin)
			continue
		}
		t.Run(lang, func(t *testing.T) {
			res := r.Run(context.Background(), sumProblem, code, lang)
			if res.Status != domain.StatusAccepted {
				t.Fatalf("want Accepted, got %q (error: %s, output: %s)", res.Status, res.Error, res.Output)
			}
		})
	}
}

// ── DockerRunner ─────────────────────────────────────────────────────────────

func dockerImagePresent(image string) bool {
	out, err := exec.Command("docker", "image", "inspect", image).CombinedOutput()
	return err == nil && len(out) > 2
}

func TestDockerRunner_C_Accepted(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("docker not found on PATH")
	}
	if !dockerImagePresent("gcc:14") {
		t.Skip("gcc:14 image not pulled — run: docker pull gcc:14")
	}
	logger, _ := zap.NewDevelopment()
	r := NewDockerRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["c"], "c")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}

func TestDockerRunner_CPP_Accepted(t *testing.T) {
	if _, err := exec.LookPath("docker"); err != nil {
		t.Skip("docker not found on PATH")
	}
	if !dockerImagePresent("gcc:14") {
		t.Skip("gcc:14 image not pulled — run: docker pull gcc:14")
	}
	logger, _ := zap.NewDevelopment()
	r := NewDockerRunner(logger)
	res := r.Run(context.Background(), sumProblem, codeByLang["cpp"], "cpp")
	if res.Status != domain.StatusAccepted {
		t.Fatalf("want Accepted, got %q (error: %s)", res.Status, res.Error)
	}
}
