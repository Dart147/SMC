package judge

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/domain"
)

type dockerLangConfig struct {
	image    string
	cmd      []string
	ext      string
	compiled bool
	buildCmd []string // compile-only command run before test cases
	extraEnv []string // extra KEY=VALUE pairs passed via -e
}

var dockerLangConfigs = map[string]dockerLangConfig{
	"python": {
		image: "python:3.12-slim",
		cmd:   []string{"python3", "/code.py"},
		ext:   ".py",
	},
	"javascript": {
		image: "node:20-slim",
		cmd:   []string{"node", "/code.js"},
		ext:   ".js",
	},
	"go": {
		image:    "golang:1.22-alpine",
		cmd:      []string{"go", "run", "/code.go"},
		ext:      ".go",
		compiled: true,
		buildCmd: []string{"go", "build", "-o", "/tmp/out", "/code.go"},
		// Go toolchain writes build cache and GOPATH under /root by default.
		// Redirect both to /tmp so they land on the writable tmpfs mount.
		extraEnv: []string{"GOPATH=/tmp/go", "GOCACHE=/tmp/go-cache"},
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

// pullImages pre-pulls all language images so the first submission does not pay the pull latency.
func (r *DockerRunner) pullImages() {
	for lang, cfg := range dockerLangConfigs {
		r.logger.Info("pulling sandbox image", zap.String("language", lang), zap.String("image", cfg.image))
		out, err := exec.Command("docker", "pull", cfg.image).CombinedOutput()
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

	tmpFile, err := os.CreateTemp("", "smc-*"+cfg.ext)
	if err != nil {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to create temp file",
			TotalTestCases: len(prob.TestCases),
		}
	}
	defer func() {
		if err := os.Remove(tmpFile.Name()); err != nil {
			r.logger.Warn("temp file cleanup", zap.String("path", tmpFile.Name()), zap.Error(err))
		}
	}()

	if _, err := tmpFile.WriteString(code); err != nil {
		if cerr := tmpFile.Close(); cerr != nil {
			r.logger.Warn("temp file close after write error", zap.Error(cerr))
		}
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to write code",
			TotalTestCases: len(prob.TestCases),
		}
	}
	if err := tmpFile.Close(); err != nil {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to close temp file",
			TotalTestCases: len(prob.TestCases),
		}
	}

	total := len(prob.TestCases)

	if cfg.compiled {
		if result, failed := r.compileCheck(ctx, cfg, tmpFile.Name(), total); failed {
			return result
		}
	}

	passed := 0
	var lastOutput string
	for i, tc := range prob.TestCases {
		result, ok := r.runTestCase(ctx, cfg, tmpFile.Name(), tc, i, passed, total)
		if !ok {
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
	}
}

func (r *DockerRunner) compileCheck(ctx context.Context, cfg dockerLangConfig, file string, total int) (Result, bool) {
	compileCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	cmd := exec.CommandContext(compileCtx, "docker", r.dockerArgs(cfg, file, cfg.buildCmd)...)
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

func (r *DockerRunner) runTestCase(ctx context.Context, cfg dockerLangConfig, file string, tc domain.TestCase, idx, passed, total int) (Result, bool) {
	execCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	cmd := exec.CommandContext(execCtx, "docker", r.dockerArgs(cfg, file, cfg.cmd)...)
	cmd.Stdin = strings.NewReader(tc.Input)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	runErr := cmd.Run()

	if execCtx.Err() == context.DeadlineExceeded {
		return Result{
			Status:          domain.StatusTimeLimitExceeded,
			Error:           fmt.Sprintf("test case %d timed out", idx+1),
			PassedTestCases: passed,
			TotalTestCases:  total,
		}, false
	}

	if runErr != nil {
		return Result{
			Status:          domain.StatusRuntimeError,
			Output:          stdout.String(),
			Error:           strings.TrimSpace(stderr.String()),
			PassedTestCases: passed,
			TotalTestCases:  total,
		}, false
	}

	actual := strings.TrimRight(stdout.String(), "\n\r ")
	expected := strings.TrimRight(tc.ExpectedOutput, "\n\r ")
	if actual != expected {
		return Result{
			Status:               domain.StatusWrongAnswer,
			Output:               stdout.String(),
			ExpectedOutput:       tc.ExpectedOutput,
			ExpectedOutputHidden: tc.IsHidden,
			Error:                fmt.Sprintf("test case %d failed", idx+1),
			PassedTestCases:      passed,
			TotalTestCases:       total,
		}, false
	}

	return Result{Output: stdout.String()}, true
}

// dockerArgs builds the argument list for `docker run` with full isolation flags.
//
//	--network none   no outbound or inbound network
//	--memory 256m    hard cap via Linux cgroups
//	--cpus 0.5       prevent CPU starvation
//	--read-only      immutable root filesystem
//	--tmpfs /tmp     writable in-memory scratch space (needed for Go compilation)
//	-v file:/code    only the submitted file is visible inside the container
func (r *DockerRunner) dockerArgs(cfg dockerLangConfig, hostFile string, containerCmd []string) []string {
	volume := hostFile + ":/code" + cfg.ext + ":ro"

	args := []string{
		"run", "--rm",
		"--network", "none",
		"--memory", "256m",
		"--cpus", "0.5",
		"--read-only",
		"--tmpfs", "/tmp",
		"-i",
		"-v", volume,
	}
	for _, env := range cfg.extraEnv {
		args = append(args, "-e", env)
	}
	args = append(args, cfg.image)
	args = append(args, containerCmd...)
	return args
}
