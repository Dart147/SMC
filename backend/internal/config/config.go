package config

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Port     int    `yaml:"port"`
	LogLevel string `yaml:"log_level"`
	SeedFile string `yaml:"seed_file"`
}

func Load(path string) (*Config, error) {
	cfg := &Config{
		Port:     8081,
		LogLevel: "info",
		SeedFile: "api/problems.yaml",
	}

	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("read config file: %w", err)
	}
	if err == nil {
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("parse config file: %w", err)
		}
	}

	if v := os.Getenv("PORT"); v != "" {
		p, err := strconv.Atoi(v)
		if err != nil {
			return nil, fmt.Errorf("invalid PORT env var: %w", err)
		}
		cfg.Port = p
	}
	if v := os.Getenv("LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	if v := os.Getenv("SEED_FILE"); v != "" {
		cfg.SeedFile = v
	}

	return cfg, nil
}
