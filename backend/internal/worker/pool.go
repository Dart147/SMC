package worker

import (
	"context"
	"time"
)

// Processor is satisfied by SubmissionService.RunNext.
type Processor interface {
	RunNext(ctx context.Context) bool
}

// Pool runs n goroutines that continuously drain the submission queue.
type Pool struct {
	processor Processor
	n         int
}

func NewPool(p Processor, n int) *Pool {
	return &Pool{processor: p, n: n}
}

// Start launches n worker goroutines. They stop when ctx is cancelled.
func (p *Pool) Start(ctx context.Context) {
	for i := 0; i < p.n; i++ {
		go p.loop(ctx)
	}
}

func (p *Pool) loop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if !p.processor.RunNext(ctx) {
				select {
				case <-time.After(500 * time.Millisecond):
				case <-ctx.Done():
					return
				}
			}
		}
	}
}
