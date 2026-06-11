// Package tracing configures the OpenTelemetry tracer provider that
// exports spans to Tempo over OTLP gRPC
package tracing

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// serviceName must equal the Loki "app" label value: the Grafana Tempo
// datasource's trace→logs query is {app="${__span.tags['service.name']}"}.
const serviceName = "smc-backend"

// newResource describes the emitting service
func newResource(version, commitHash, env string) (*resource.Resource, error) {
	res, err := resource.New(context.Background(),
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
			semconv.ServiceNamespaceKey.String("smc"),
			semconv.ServiceVersionKey.String(version),
			attribute.String("service.commit_hash", commitHash),
			semconv.DeploymentEnvironmentNameKey.String(env),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("create otel resource: %w", err)
	}
	return res, nil
}

// InitTracing sets the global tracer provider
// collectorURL is a gRPC target ("tempo:4317")
func InitTracing(collectorURL, version, commitHash, env string) (func(context.Context) error, error) {
	res, err := newResource(version, commitHash, env)
	if err != nil {
		return nil, err
	}

	opts := []sdktrace.TracerProviderOption{
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	}

	if collectorURL != "" {
		// Plaintext gRPC: tempo:4317 lives on an internal Docker network
		conn, err := grpc.NewClient(collectorURL,
			grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			return nil, fmt.Errorf("dial otel collector %q: %w", collectorURL, err)
		}

		exporter, err := otlptracegrpc.New(context.Background(),
			otlptracegrpc.WithGRPCConn(conn))
		if err != nil {
			return nil, fmt.Errorf("create otlp trace exporter: %w", err)
		}

		opts = append(opts, sdktrace.WithSpanProcessor(
			sdktrace.NewBatchSpanProcessor(exporter)))
	}

	tp := sdktrace.NewTracerProvider(opts...)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp.Shutdown, nil
}
