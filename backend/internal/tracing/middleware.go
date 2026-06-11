package tracing

import (
	"net/http"

	traceutil "github.com/NYCU-SDC/summer/pkg/trace"
	"go.uber.org/zap"
)

// Probe endpoints hit every few seconds by Docker healthchecks and
// Prometheus; tracing them would bury real traffic in noise.
var skipPaths = map[string]bool{
	"/api/healthz": true,
	"/metrics":     true,
}

// summerDebug is hardcoded false and must stay false in deployed
// environments: summer's debug mode buffers whole request bodies and on
// a 500 logs bodies + headers — for SMC that would ship login passwords
// and Authorization headers to Loki.
const summerDebug = false

// Middleware adapts summer's TraceMiddleware (the same library the SDC
// reference backend uses) to SMC's mux-level chain. Per request it
// starts a span, joins upstream traces via the W3C traceparent header,
// and logs a completion line carrying trace_id/span_id — the fields the
// Grafana Loki→Tempo derived field reads.
//
// Known summer conventions we accept: 4xx is logged at Error level
// ("Client request rejected"), and handlers that never call WriteHeader
// are logged as status 0 (SMC handlers always set a status via
// writeJSON, so this stays dormant).
func Middleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		traced := traceutil.TraceMiddleware(next.ServeHTTP, logger, summerDebug)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if skipPaths[r.URL.Path] {
				next.ServeHTTP(w, r)
				return
			}
			traced(w, r)
		})
	}
}

// RecoverMiddleware adapts summer's panic recovery: a panicking handler
// is logged with the stack (and recorded on the span) and the client
// gets a clean RFC 7807 problem response instead of a connection reset.
func RecoverMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(
			traceutil.RecoverMiddleware(next.ServeHTTP, logger, summerDebug))
	}
}
