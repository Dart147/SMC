package service

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	oteltrace "go.opentelemetry.io/otel/trace"

	"github.com/Dart147/SMC/backend/internal/domain"
	"github.com/Dart147/SMC/backend/internal/judge"
)

func installTestTracer(t *testing.T) *tracetest.InMemoryExporter {
	t.Helper()
	exporter := tracetest.NewInMemoryExporter()
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSyncer(exporter),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)
	prev := otel.GetTracerProvider()
	otel.SetTracerProvider(tp)
	t.Cleanup(func() {
		otel.SetTracerProvider(prev)
		_ = tp.Shutdown(context.Background())
	})
	return exporter
}

func attrMap(span tracetest.SpanStub) map[string]string {
	m := make(map[string]string, len(span.Attributes))
	for _, kv := range span.Attributes {
		m[string(kv.Key)] = kv.Value.String()
	}
	return m
}

func findSpan(t *testing.T, spans tracetest.SpanStubs, name string) tracetest.SpanStub {
	t.Helper()
	for _, s := range spans {
		if s.Name == name {
			return s
		}
	}
	t.Fatalf("span %q not found in %d exported spans", name, len(spans))
	return tracetest.SpanStub{}
}

func TestSubmissionService_RunSample_EmitsChildSpan(t *testing.T) {
	exporter := installTestTracer(t)

	prob := sampleProblem()
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{prob: prob, found: true},
		&mockRunner{result: judge.Result{Status: domain.StatusAccepted}})

	// Simulate the HTTP middleware's request span as the parent.
	ctx, parent := otel.Tracer("test").Start(context.Background(), "POST /api/run")
	if _, err := svc.RunSample(ctx, "1", "print(1)", "python"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	parent.End()

	span := findSpan(t, exporter.GetSpans(), "SubmissionService.RunSample")
	if span.Parent.SpanID() != parent.SpanContext().SpanID() {
		t.Errorf("RunSample span must be a child of the request span; got parent %s, want %s",
			span.Parent.SpanID(), parent.SpanContext().SpanID())
	}
	attrs := attrMap(span)
	if attrs["problem_id"] != "1" {
		t.Errorf("problem_id: got %q, want '1'", attrs["problem_id"])
	}
	if attrs["language"] != "python" {
		t.Errorf("language: got %q, want 'python'", attrs["language"])
	}
}

func TestSubmissionService_RunSample_RecordsError(t *testing.T) {
	exporter := installTestTracer(t)

	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{found: false}, &mockRunner{})
	if _, err := svc.RunSample(context.Background(), "missing", "code", "go"); err == nil {
		t.Fatal("expected error for missing problem")
	}

	span := findSpan(t, exporter.GetSpans(), "SubmissionService.RunSample")
	if len(span.Events) == 0 {
		t.Error("expected an error event recorded on the span")
	}
}

func TestSubmissionService_JudgeAndUpdate_EmitsRootSpan(t *testing.T) {
	exporter := installTestTracer(t)

	prob := sampleProblem()
	sub := domain.Submission{
		ID: "sub-1", ProblemID: "1", Language: "python",
		Code: "print(1)", TotalTestCases: 1,
	}
	svc := newSvc(&mockSubmissionRepo{}, &mockProblemRepo{prob: prob, found: true},
		&mockRunner{result: judge.Result{Status: domain.StatusAccepted, PassedTestCases: 1}})

	svc.judgeAndUpdate(sub, prob)

	span := findSpan(t, exporter.GetSpans(), "judge.submission")
	// The HTTP span ended at enqueue time; the judge run is its own trace.
	if span.Parent.IsValid() {
		t.Errorf("judge.submission must be a root span; got parent %s", span.Parent.SpanID())
	}
	if span.SpanKind != oteltrace.SpanKindInternal {
		t.Errorf("span kind: got %v, want Internal", span.SpanKind)
	}
	attrs := attrMap(span)
	if attrs["submission_id"] != "sub-1" {
		t.Errorf("submission_id: got %q, want 'sub-1'", attrs["submission_id"])
	}
	if attrs["problem_id"] != "1" {
		t.Errorf("problem_id: got %q, want '1'", attrs["problem_id"])
	}
	if attrs["language"] != "python" {
		t.Errorf("language: got %q, want 'python'", attrs["language"])
	}
	// Domain rule: identifiers only — never verdict or score on spans.
	for _, forbidden := range []string{"score", "verdict", "status", "passed_test_cases"} {
		if _, ok := attrs[forbidden]; ok {
			t.Errorf("span must not carry %q", forbidden)
		}
	}
}
