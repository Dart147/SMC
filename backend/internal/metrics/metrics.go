package metrics

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	reg           *prometheus.Registry
	HTTPRequests  *prometheus.CounterVec   // Counter
	HTTPDuration  *prometheus.HistogramVec // Histogram
	Submissions   *prometheus.CounterVec   // Counter
	JudgeDuration *prometheus.HistogramVec // Histogram
	QueueDepth    prometheus.Gauge
	WorkerActive  prometheus.Gauge
}

func New() *Metrics {
	reg := prometheus.NewRegistry()
	reg.MustRegister(collectors.NewGoCollector())
	reg.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))

	m := &Metrics{
		reg: reg,
		HTTPRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests by method, route, status.",
		}, []string{"method", "route", "status"}),
		HTTPDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency by method, route.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route"}),
		Submissions: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "smc_submissions_total",
			Help: "Total judged submissions by language and verdict.",
		}, []string{"language", "verdict"}),
		JudgeDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "smc_judge_duration_seconds",
			Help:    "Sandbox judge run time by language.",
			Buckets: prometheus.DefBuckets,
		}, []string{"language"}),
		QueueDepth: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "smc_judge_queue_depth",
			Help: "Pending submissions awaiting judging.",
		}),
		WorkerActive: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "smc_worker_active",
			Help: "Worker goroutines currently judging.",
		}),
	}
	reg.MustRegister(m.HTTPRequests, m.HTTPDuration, m.Submissions,
		m.JudgeDuration, m.QueueDepth, m.WorkerActive)
	return m
}

// Handler serves the metrics on the private registry.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.reg, promhttp.HandlerOpts{})
}
