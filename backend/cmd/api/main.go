package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/config"
	"github.com/Dart147/SMC/backend/internal/handler"
	"github.com/Dart147/SMC/backend/internal/judge"
	"github.com/Dart147/SMC/backend/internal/middleware"
	"github.com/Dart147/SMC/backend/internal/repository"
	"github.com/Dart147/SMC/backend/internal/service"
)

func main() {
	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		os.Exit(1)
	}

	logger, err := buildLogger(cfg.LogLevel)
	if err != nil {
		fmt.Fprintf(os.Stderr, "init logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync() //nolint:errcheck

	// Repositories
	problemRepo, err := repository.NewProblemRepo(cfg.SeedFile)
	if err != nil {
		logger.Fatal("load problems", zap.Error(err))
	}
	submissionRepo := repository.NewSubmissionRepo()

	// Services
	problemSvc := service.NewProblemService(problemRepo)
	j := judge.NewJudge(logger)
	submissionSvc := service.NewSubmissionService(submissionRepo, problemRepo, j, logger)

	// Handlers
	problemH := handler.NewProblemHandler(problemSvc)
	submissionH := handler.NewSubmissionHandler(submissionSvc)

	// Router (Go 1.22 pattern-based mux)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/healthz", handler.Health)
	mux.HandleFunc("GET /api/problems", problemH.List)
	mux.HandleFunc("GET /api/problems/{id}", problemH.GetByID)
	mux.HandleFunc("POST /api/submissions", submissionH.Create)
	mux.HandleFunc("GET /api/submissions/{id}", submissionH.GetByID)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      middleware.CORS(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("server starting", zap.Int("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", zap.Error(err))
	}
}

func buildLogger(level string) (*zap.Logger, error) {
	if level == "debug" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
