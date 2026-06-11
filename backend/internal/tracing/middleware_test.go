package tracing

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"
)

// installs a recording tracer provider and returns the recorder.
func setupRecorder(t *testing.T) *tracetest.SpanRecorder {
	t.Helper()
	recorder := tracetest.NewSpanRecorder()
	shutdown, err := InitTracing("", "dev", "dev", "test")
	if err != nil {
		t.Fatalf("InitTracing: %v", err)
	}
	t.Cleanup(func() { _ = shutdown(t.Context()) })

	// Attach the recorder to a fresh provider so tests can inspect spans.
	tp := sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder))
	t.Cleanup(func() { _ = tp.Shutdown(t.Context()) })
	otel.SetTracerProvider(tp)
	return recorder
}

func doRequest(handler http.Handler, method, path string, header http.Header) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	for k, vs := range header {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	return rr
}

func TestMiddleware_PassesResponseThrough(t *testing.T) {
	setupRecorder(t)
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte("hello"))
	})
	rr := doRequest(Middleware(zap.NewNop())(inner), "POST", "/api/submissions", nil)

	if rr.Code != http.StatusCreated {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusCreated)
	}
	if rr.Body.String() != "hello" {
		t.Errorf("body = %q, want %q", rr.Body.String(), "hello")
	}
}

func TestMiddleware_RecordsSpan(t *testing.T) {
	recorder := setupRecorder(t)
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})
	doRequest(Middleware(zap.NewNop())(inner), "GET", "/api/problems/999", nil)

	spans := recorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("got %d spans, want 1", len(spans))
	}
	span := spans[0]
	// summer names spans "METHOD /path" and sets method/path/query attrs.
	if span.Name() != "GET /api/problems/999" {
		t.Errorf("span name = %q, want %q", span.Name(), "GET /api/problems/999")
	}
	attrs := make(map[string]string)
	for _, kv := range span.Attributes() {
		attrs[string(kv.Key)] = kv.Value.AsString()
	}
	if attrs["method"] != "GET" || attrs["path"] != "/api/problems/999" {
		t.Errorf("span attributes = %v, want method=GET path=/api/problems/999", attrs)
	}
}

func TestMiddleware_JoinsUpstreamTrace(t *testing.T) {
	recorder := setupRecorder(t)
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {})

	// Valid W3C traceparent: version-traceid-spanid-flags.
	const upstreamTraceID = "4bf92f3577b34da6a3ce929d0e0e4736"
	header := http.Header{}
	header.Set("traceparent", "00-"+upstreamTraceID+"-00f067aa0ba902b7-01")
	doRequest(Middleware(zap.NewNop())(inner), "GET", "/api/problems", header)

	spans := recorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("got %d spans, want 1", len(spans))
	}
	if got := spans[0].SpanContext().TraceID().String(); got != upstreamTraceID {
		t.Errorf("trace ID = %s, want upstream %s", got, upstreamTraceID)
	}
}

func TestMiddleware_LogsCompletionWithTraceID(t *testing.T) {
	recorder := setupRecorder(t)
	// Info level filters out summer's per-request Debug lines.
	core, logs := observer.New(zapcore.InfoLevel)
	logger := zap.New(core)

	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	doRequest(Middleware(logger)(inner), "GET", "/api/problems", nil)

	entries := logs.All()
	if len(entries) != 1 {
		t.Fatalf("got %d log entries, want 1", len(entries))
	}
	entry := entries[0]
	if entry.Level != zapcore.InfoLevel {
		t.Errorf("2xx log level = %s, want info", entry.Level)
	}

	fields := make(map[string]string)
	for _, f := range entry.Context {
		if f.Type == zapcore.StringType {
			fields[f.Key] = f.String
		}
	}
	traceID, ok := fields["trace_id"]
	if !ok {
		t.Fatal("completion log missing trace_id field")
	}
	spans := recorder.Ended()
	if len(spans) != 1 {
		t.Fatalf("got %d spans, want 1", len(spans))
	}
	if traceID != spans[0].SpanContext().TraceID().String() {
		t.Errorf("logged trace_id %v != span trace ID %s", traceID, spans[0].SpanContext().TraceID())
	}
}

// Pins summer's documented severity convention (tempo_plan §3.5d): 4xx is
// logged at Error, not Warn. If a summer upgrade changes this, we want to
// know — error-rate log queries depend on it.
func TestMiddleware_LogSeverityByStatusClass(t *testing.T) {
	cases := []struct {
		status int
		want   zapcore.Level
	}{
		{200, zapcore.InfoLevel},
		{401, zapcore.ErrorLevel}, // summer: "Client request rejected"
		{500, zapcore.ErrorLevel},
	}
	for _, tc := range cases {
		setupRecorder(t)
		core, logs := observer.New(zapcore.InfoLevel)
		inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(tc.status)
		})
		doRequest(Middleware(zap.New(core))(inner), "GET", "/api/x", nil)

		entries := logs.All()
		if len(entries) != 1 {
			t.Fatalf("status %d: got %d log entries, want 1", tc.status, len(entries))
		}
		if entries[0].Level != tc.want {
			t.Errorf("status %d logged at %s, want %s", tc.status, entries[0].Level, tc.want)
		}
	}
}

func TestMiddleware_SkipsHealthzAndMetrics(t *testing.T) {
	recorder := setupRecorder(t)
	core, logs := observer.New(zapcore.DebugLevel)
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {})
	handler := Middleware(zap.New(core))(inner)

	doRequest(handler, "GET", "/api/healthz", nil)
	doRequest(handler, "GET", "/metrics", nil)

	if n := len(recorder.Ended()); n != 0 {
		t.Errorf("got %d spans for probe endpoints, want 0", n)
	}
	if n := len(logs.All()); n != 0 {
		t.Errorf("got %d log entries for probe endpoints, want 0", n)
	}
}

func TestRecoverMiddleware_PanicYieldsCleanResponse(t *testing.T) {
	setupRecorder(t)
	core, logs := observer.New(zapcore.ErrorLevel)
	inner := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})
	rr := doRequest(RecoverMiddleware(zap.New(core))(inner), "GET", "/api/problems", nil)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusInternalServerError)
	}
	if len(logs.All()) == 0 {
		t.Error("panic was not logged")
	}
}
