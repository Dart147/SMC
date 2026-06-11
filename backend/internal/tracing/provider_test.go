package tracing

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

// The Grafana Tempo datasource's trace→logs query is
// {app="${__span.tags['service.name']}"}, so service.name must equal the Loki app label value
func TestNewResource_ContractAttributes(t *testing.T) {
	res, err := newResource("v1.2.3", "abc1234", "prod")
	if err != nil {
		t.Fatalf("newResource returned error: %v", err)
	}

	want := map[attribute.Key]string{
		"service.name":                "smc-backend",
		"service.namespace":           "smc",
		"service.version":             "v1.2.3",
		"service.commit_hash":         "abc1234",
		"deployment.environment.name": "prod",
	}

	got := make(map[attribute.Key]string)
	for _, kv := range res.Attributes() {
		got[kv.Key] = kv.Value.AsString()
	}

	for key, wantVal := range want {
		gotVal, ok := got[key]
		if !ok {
			t.Errorf("resource missing attribute %q", key)
			continue
		}
		if gotVal != wantVal {
			t.Errorf("attribute %q = %q, want %q", key, gotVal, wantVal)
		}
	}
}

func TestInitTracing_EmptyURLIsCleanNoOp(t *testing.T) {
	shutdown, err := InitTracing("", "dev", "dev", "prod")
	if err != nil {
		t.Fatalf("InitTracing with empty URL must not fail: %v", err)
	}
	if shutdown == nil {
		t.Fatal("InitTracing returned nil shutdown func")
	}

	// Spans must still be creatable (middleware code paths are identical
	// with or without an exporter).
	_, span := otel.Tracer("test").Start(context.Background(), "noop")
	span.End()

	if err := shutdown(context.Background()); err != nil {
		t.Errorf("shutdown returned error: %v", err)
	}
}

func TestInitTracing_RegistersW3CPropagator(t *testing.T) {
	shutdown, err := InitTracing("", "dev", "dev", "prod")
	if err != nil {
		t.Fatalf("InitTracing returned error: %v", err)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			t.Errorf("shutdown returned error: %v", err)
		}
	}()

	fields := otel.GetTextMapPropagator().Fields()
	hasTraceparent := false
	for _, f := range fields {
		if f == "traceparent" {
			hasTraceparent = true
		}
	}
	if !hasTraceparent {
		t.Errorf("propagator fields %v missing %q (W3C TraceContext not registered)", fields, "traceparent")
	}
}
