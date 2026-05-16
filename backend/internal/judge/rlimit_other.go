//go:build !linux

package judge

import "os/exec"

// applyMemoryLimit is a no-op on non-Linux platforms.
// Docker isolation is required for memory enforcement on macOS/Windows.
func applyMemoryLimit(_ *exec.Cmd, _ uint64) {}

func isMemoryLimitExceeded(_ *exec.Cmd, _ error) bool { return false }
