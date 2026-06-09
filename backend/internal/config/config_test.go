package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad_DefaultsWhenFileMissing(t *testing.T) {
	cfg, err := Load("/nonexistent/path/config.yaml")
	if err != nil {
		t.Fatalf("expected no error for missing file, got: %v", err)
	}
	if cfg.Port != 8081 {
		t.Errorf("Port: got %d, want 8081", cfg.Port)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("LogLevel: got %q, want 'info'", cfg.LogLevel)
	}
	if cfg.SeedFile != "api/problems.yaml" {
		t.Errorf("SeedFile: got %q, want 'api/problems.yaml'", cfg.SeedFile)
	}
}

func TestLoad_FromYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := "port: 9090\nlog_level: debug\nseed_file: /custom/seed.yaml\n"
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 9090 {
		t.Errorf("Port: got %d, want 9090", cfg.Port)
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("LogLevel: got %q, want 'debug'", cfg.LogLevel)
	}
	if cfg.SeedFile != "/custom/seed.yaml" {
		t.Errorf("SeedFile: got %q, want '/custom/seed.yaml'", cfg.SeedFile)
	}
}

func TestLoad_EnvOverridePort(t *testing.T) {
	t.Setenv("PORT", "7777")
	cfg, err := Load("/nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 7777 {
		t.Errorf("Port: got %d, want 7777", cfg.Port)
	}
}

func TestLoad_EnvOverrideLogLevel(t *testing.T) {
	t.Setenv("LOG_LEVEL", "warn")
	cfg, err := Load("/nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.LogLevel != "warn" {
		t.Errorf("LogLevel: got %q, want 'warn'", cfg.LogLevel)
	}
}

func TestLoad_EnvOverrideSeedFile(t *testing.T) {
	t.Setenv("SEED_FILE", "/env/seed.yaml")
	cfg, err := Load("/nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.SeedFile != "/env/seed.yaml" {
		t.Errorf("SeedFile: got %q, want '/env/seed.yaml'", cfg.SeedFile)
	}
}

func TestLoad_InvalidYAML(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	if err := os.WriteFile(path, []byte("not: valid: yaml: :::"), 0600); err != nil {
		t.Fatal(err)
	}
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected error for invalid YAML, got nil")
	}
}

func TestLoad_InvalidPortEnv(t *testing.T) {
	t.Setenv("PORT", "not-a-number")
	_, err := Load("/nonexistent")
	if err == nil {
		t.Fatal("expected error for invalid PORT env var, got nil")
	}
}

func TestLoad_YAMLPartialOverridesDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	// Only set port, leave others as default
	if err := os.WriteFile(path, []byte("port: 3000\n"), 0600); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Port != 3000 {
		t.Errorf("Port: got %d, want 3000", cfg.Port)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("LogLevel: got %q, want 'info' (default)", cfg.LogLevel)
	}
}
