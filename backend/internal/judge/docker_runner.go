package judge

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type dockerLangConfig struct {
	image     string
	ext       string
	compiled  bool
	runSh     string // shell snippet; code is already written to /tmp/code<ext>
	compileSh string // compile-only snippet for pre-run error check
}

var dockerLangConfigs = map[string]dockerLangConfig{
	"python": {
		image: "python:3.12-slim",
		ext:   ".py",
		runSh: "python3 /tmp/code.py",
	},
	"javascript": {
		image: "node:20-slim",
		ext:   ".js",
		runSh: "node /tmp/code.js",
	},
	// GO111MODULE=off: single-file submissions have no go.mod; GOPATH mode handles them.
	// GOPATH/GOCACHE redirect to /tmp so the read-only root filesystem isn't touched.
	"go": {
		image:     "golang:1.22-alpine",
		ext:       ".go",
		compiled:  true,
		runSh:     "GO111MODULE=off GOPATH=/tmp/go GOCACHE=/tmp/go-cache go run /tmp/code.go",
		compileSh: "GO111MODULE=off GOPATH=/tmp/go GOCACHE=/tmp/go-cache go build -o /tmp/out /tmp/code.go",
	},
	"c": {
		image:     "gcc:14",
		ext:       ".c",
		compiled:  true,
		runSh:     "gcc -O2 /tmp/code.c -o /tmp/out && /tmp/out",
		compileSh: "gcc -O2 /tmp/code.c -o /tmp/out",
	},
	"cpp": {
		image:     "gcc:14",
		ext:       ".cpp",
		compiled:  true,
		runSh:     "g++ -O2 -std=c++17 /tmp/code.cpp -o /tmp/out && /tmp/out",
		compileSh: "g++ -O2 -std=c++17 /tmp/code.cpp -o /tmp/out",
	},
}

// DockerRunner executes user code inside an isolated Docker container per test case.
// Isolation: no network, 256 MB memory cap, 0.5 CPU, read-only root filesystem.
type DockerRunner struct {
	logger *zap.Logger
}

func NewDockerRunner(logger *zap.Logger) *DockerRunner {
	r := &DockerRunner{logger: logger}
	r.pullImages()
	return r
}

const dockerBin = "/usr/bin/docker"

func (r *DockerRunner) pullImages() {
	for lang, cfg := range dockerLangConfigs {
		r.logger.Info("pulling sandbox image", zap.String("language", lang), zap.String("image", cfg.image))
		out, err := exec.Command(dockerBin, "pull", cfg.image).CombinedOutput()
		if err != nil {
			r.logger.Warn("image pull failed — first submission may be slow",
				zap.String("image", cfg.image),
				zap.String("output", string(out)),
				zap.Error(err))
		} else {
			r.logger.Info("image ready", zap.String("image", cfg.image))
		}
	}
}

func (r *DockerRunner) Run(ctx context.Context, prob domain.Problem, code, language string) Result {
	cfg, ok := dockerLangConfigs[language]
	if !ok {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          fmt.Sprintf("unsupported language: %q", language),
			TotalTestCases: len(prob.TestCases),
		}
	}

	if len(prob.TestCases) == 0 {
		return Result{
			Status: domain.StatusAccepted,
			Output: "no test cases defined",
		}
	}

	total := len(prob.TestCases)

	if cfg.compiled {
		if result, failed := r.compileCheck(ctx, cfg, code, total); failed {
			return result
		}
	}

	timeout := executionTimeout(prob.TimeLimitMs)
	passed := 0
	var lastOutput string
	totalMs := 0
	for i, tc := range prob.TestCases {
		result, ok := r.runTestCase(ctx, cfg, code, tc, timeout, tcProgress{idx: i, passed: passed, total: total})
		totalMs += result.ExecutionTimeMs
		if !ok {
			result.ExecutionTimeMs = totalMs
			return result
		}
		lastOutput = result.Output
		passed++
	}

	return Result{
		Status:          domain.StatusAccepted,
		Output:          lastOutput,
		PassedTestCases: passed,
		TotalTestCases:  total,
		ExecutionTimeMs: totalMs,
	}
}

func (r *DockerRunner) compileCheck(ctx context.Context, cfg dockerLangConfig, code string, total int) (Result, bool) {
	compileCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	cmd := exec.CommandContext(compileCtx, dockerBin, r.dockerArgs(cfg, code, cfg.compileSh)...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return Result{
			Status:         domain.StatusCompileError,
			Error:          stderr.String(),
			TotalTestCases: total,
		}, true
	}
	return Result{}, false
}

func (r *DockerRunner) runTestCase(ctx context.Context, cfg dockerLangConfig, code string, tc domain.TestCase, timeout time.Duration, p tcProgress) (Result, bool) {
	execCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cmd := exec.CommandContext(execCtx, dockerBin, r.dockerArgs(cfg, code, cfg.runSh)...)
	cmd.Stdin = strings.NewReader(tc.Input)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	runErr := cmd.Run()
	elapsedMs := int(time.Since(start).Milliseconds())

	if execCtx.Err() == context.DeadlineExceeded {
		return tlResult(p, elapsedMs), false
	}

	if runErr != nil {
		return reResult(stdout.String(), strings.TrimSpace(stderr.String()), p, elapsedMs), false
	}

	actual := strings.TrimRight(stdout.String(), "\n\r ")
	expected := strings.TrimRight(tc.ExpectedOutput, "\n\r ")
	if actual != expected {
		return waResult(tc, stdout.String(), p, elapsedMs), false
	}

	return Result{Output: stdout.String(), ExecutionTimeMs: elapsedMs}, true
}

// dockerArgs builds the `docker run` argument list.
//
// Code is delivered via the SMC_CODE env var (base64-encoded) and decoded into
// /tmp/code<ext> at container startup. This avoids any bind-mount host-path
// dependency, which breaks when the backend itself runs inside a container:
// Docker daemon resolves volume paths on the host, not inside the backend container.
//
//	--network none    no outbound or inbound network
//	--memory 256m     hard cap via Linux cgroups
//	--cpus 0.5        prevent CPU starvation
//	--read-only       immutable root filesystem
//	--tmpfs /tmp:exec writable in-memory scratch (exec flag needed for compiled binaries)
//	SMC_CODE=<b64>    base64-encoded source; decoded to /tmp/code<ext> before running
func (r *DockerRunner) dockerArgs(cfg dockerLangConfig, code, shScript string) []string {
	encoded := base64.StdEncoding.EncodeToString([]byte(code))
	script := fmt.Sprintf("echo \"$SMC_CODE\" | base64 -d > /tmp/code%s && %s", cfg.ext, shScript)

	return []string{
		"run", "--rm",
		"--network", "none",
		"--memory", "256m",
		"--cpus", "0.5",
		"--read-only",
		"--tmpfs", "/tmp:exec",
		"-i",
		"-e", "SMC_CODE=" + encoded,
		cfg.image,
		"sh", "-c", script,
	}
}
