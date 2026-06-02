//go:build linux

package judge

import "os/exec"

func applyMemoryLimit(_ *exec.Cmd, _ uint64) {}

func isMemoryLimitExceeded(_ *exec.Cmd, _ error) bool { return false }
