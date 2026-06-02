package worker_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Dart147/SMC/backend/internal/worker"
)

// processorFunc is a test adapter that satisfies the Processor interface.
type processorFunc func(ctx context.Context) bool

func (f processorFunc) RunNext(ctx context.Context) bool { return f(ctx) }

// TestPool_ProcessesAllJobs verifies that workers drain a finite job queue.
func TestPool_ProcessesAllJobs(t *testing.T) {
	const jobCount = 5

	jobs := make(chan struct{}, jobCount)
	for range jobCount {
		jobs <- struct{}{}
	}

	var processed atomic.Int32
	p := worker.NewPool(processorFunc(func(_ context.Context) bool {
		select {
		case <-jobs:
			processed.Add(1)
			return true
		default:
			return false
		}
	}), 2)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	p.Start(ctx)

	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if processed.Load() == jobCount {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Errorf("processed %d/%d jobs before timeout", processed.Load(), jobCount)
}

// TestPool_StopsOnContextCancel verifies that workers stop calling RunNext
// after the context is cancelled (no goroutine leak).
func TestPool_StopsOnContextCancel(t *testing.T) {
	var callCount atomic.Int32

	p := worker.NewPool(processorFunc(func(_ context.Context) bool {
		callCount.Add(1)
		return false // always empty — keeps workers in backoff cycle
	}), 2)

	ctx, cancel := context.WithCancel(context.Background())
	p.Start(ctx)
	time.Sleep(30 * time.Millisecond) // let workers run at least one cycle

	cancel()
	// The 500 ms backoff select includes ctx.Done(), so workers should exit
	// well within 100 ms of cancellation.
	time.Sleep(100 * time.Millisecond)
	snapshot := callCount.Load()

	// If goroutines are still running they will increment the counter.
	time.Sleep(200 * time.Millisecond)
	if after := callCount.Load(); after != snapshot {
		t.Errorf("workers made %d extra RunNext calls after context cancel", after-snapshot)
	}
}

// TestPool_ConcurrencyLimitRespected verifies that no more than N jobs execute
// simultaneously, where N is the configured worker count.
func TestPool_ConcurrencyLimitRespected(t *testing.T) {
	const workerCount = 3

	var active atomic.Int32
	var maxActive atomic.Int32
	block := make(chan struct{}) // held open until test unblocks workers

	p := worker.NewPool(processorFunc(func(ctx context.Context) bool {
		cur := active.Add(1)
		defer active.Add(-1)

		// Update high-water mark.
		for {
			old := maxActive.Load()
			if cur <= old {
				break
			}
			if maxActive.CompareAndSwap(old, cur) {
				break
			}
		}

		select {
		case <-block:
		case <-ctx.Done():
		}
		return false
	}), workerCount)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	p.Start(ctx)

	time.Sleep(50 * time.Millisecond) // let all workers block inside RunNext
	close(block)

	if got := maxActive.Load(); got != workerCount {
		t.Errorf("max concurrent workers = %d, want %d", got, workerCount)
	}
}
