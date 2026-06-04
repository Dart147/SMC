package judge

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

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
		cmd:   []string{"python3", "/code_dir/code.py"},
		ext:   ".py",
	},
	"javascript": {
		image: "node:20-slim",
		cmd:   []string{"node", "/code_dir/code.js"},
		ext:   ".js",
	},
	"go": {
		image:    "golang:1.22-alpine",
		cmd:      []string{"go", "run", "/code_dir/code.go"},
		ext:      ".go",
		compiled: true,
		buildCmd: []string{"go", "build", "-o", "/tmp/out", "/code_dir/code.go"},
		// Go toolchain writes build cache and GOPATH under /root by default.
		// Redirect both to /tmp so they land on the writable tmpfs mount.
		// GO111MODULE=off uses GOPATH mode so single-file submissions don't
		// require a go.mod, which isn't present in the isolated container.
		extraEnv: []string{"GOPATH=/tmp/go", "GOCACHE=/tmp/go-cache", "GO111MODULE=off"},
	},
	// C and C++ compile and run inside each test-case container via sh -c so
	// the binary lives only in that container's /tmp tmpfs and is never persisted.
	"c": {
		image:    "gcc:14",
		cmd:      []string{"sh", "-c", "gcc -O2 /code_dir/code.c -o /tmp/out && /tmp/out"},
		ext:      ".c",
		compiled: true,
		buildCmd: []string{"sh", "-c", "gcc -O2 /code_dir/code.c -o /tmp/out"},
	},
	"cpp": {
		image:    "gcc:14",
		cmd:      []string{"sh", "-c", "g++ -O2 -std=c++17 /code_dir/code.cpp -o /tmp/out && /tmp/out"},
		ext:      ".cpp",
		compiled: true,
		buildCmd: []string{"sh", "-c", "g++ -O2 -std=c++17 /code_dir/code.cpp -o /tmp/out"},
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

	tmpDir, err := os.MkdirTemp("", "smc-*")
	if err != nil {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to create temp dir",
			TotalTestCases: len(prob.TestCases),
		}
	}
	defer func() {
		if err := os.RemoveAll(tmpDir); err != nil {
			r.logger.Warn("temp dir cleanup", zap.String("path", tmpDir), zap.Error(err))
		}
	}()

	codeFile := filepath.Join(tmpDir, "code"+cfg.ext)
	if err := os.WriteFile(codeFile, []byte(code), 0o444); err != nil {
		return Result{
			Status:         domain.StatusRuntimeError,
			Error:          "failed to write code",
			TotalTestCases: len(prob.TestCases),
		}
	}

	total := len(prob.TestCases)

	if cfg.compiled {
		if result, failed := r.compileCheck(ctx, cfg, tmpDir, total); failed {
			return result
		}
	}

	passed := 0
	var lastOutput string
	totalMs := 0
	for i, tc := range prob.TestCases {
		result, ok := r.runTestCase(ctx, cfg, tmpDir, tc, i, passed, total)
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

func (r *DockerRunner) compileCheck(ctx context.Context, cfg dockerLangConfig, dir string, total int) (Result, bool) {
	compileCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	cmd := exec.CommandContext(compileCtx, "docker", r.dockerArgs(cfg, dir, cfg.buildCmd)...)
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

func (r *DockerRunner) runTestCase(ctx context.Context, cfg dockerLangConfig, dir string, tc domain.TestCase, idx, passed, total int) (Result, bool) {
	execCtx, cancel := context.WithTimeout(ctx, ExecutionTimeout)
	defer cancel()

	cmd := exec.CommandContext(execCtx, "docker", r.dockerArgs(cfg, dir, cfg.cmd)...)
	cmd.Stdin = strings.NewReader(tc.Input)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	runErr := cmd.Run()
	elapsedMs := int(time.Since(start).Milliseconds())

	if execCtx.Err() == context.DeadlineExceeded {
		return Result{
			Status:          domain.StatusTimeLimitExceeded,
			Error:           fmt.Sprintf("test case %d timed out", idx+1),
			PassedTestCases: passed,
			TotalTestCases:  total,
			ExecutionTimeMs: elapsedMs,
		}, false
	}

	if runErr != nil {
		return Result{
			Status:          domain.StatusRuntimeError,
			Output:          stdout.String(),
			Error:           strings.TrimSpace(stderr.String()),
			PassedTestCases: passed,
			TotalTestCases:  total,
			ExecutionTimeMs: elapsedMs,
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
			ExecutionTimeMs:      elapsedMs,
		}, false
	}

	return Result{Output: stdout.String(), ExecutionTimeMs: elapsedMs}, true
}

// dockerArgs builds the argument list for `docker run` with full isolation flags.
//
//	--network none      no outbound or inbound network
//	--memory 256m       hard cap via Linux cgroups
//	--cpus 0.5          prevent CPU starvation
//	--read-only         immutable root filesystem
//	--tmpfs /tmp        writable in-memory scratch space (needed for Go compilation)
//	-v dir:/code_dir    only the submitted file's directory is visible in the container.
//	                    Mounting a directory (not a bare file) works reliably with
//	                    --read-only because Docker always creates the bind-mount target
//	                    as a directory, so the mount point is created correctly even
//	                    when it doesn't pre-exist in the image.
func (r *DockerRunner) dockerArgs(cfg dockerLangConfig, hostDir string, containerCmd []string) []string {
	volume := hostDir + ":/code_dir:ro"

	args := []string{
		"run", "--rm",
		"--network", "none",
		"--memory", "256m",
		"--cpus", "0.5",
		"--read-only",
		"--tmpfs", "/tmp:exec",
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
