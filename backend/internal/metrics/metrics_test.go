package metrics

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// handler must expose both Go runtime metrics and the app's own series.
func TestNewExposesMetrics(t *testing.T) {
	m := New()
	if m == nil {
		t.Fatal("New() returned nil")
	}

	// Touch an app metric so it appears in the scrape output.
	m.Submissions.WithLabelValues("go", "accepted").Inc()

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	m.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("scrape status = %d, want 200", rec.Code)
	}

	body := rec.Body.String()
	for _, want := range []string{"go_goroutines", "smc_submissions_total"} {
		if !strings.Contains(body, want) {
			t.Errorf("scrape output missing %q", want)
		}
	}
}
