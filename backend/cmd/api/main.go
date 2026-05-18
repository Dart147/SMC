package main

import (
	"context"
	"database/sql" // 新增 sql 標準庫
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"
	_ "github.com/lib/pq" // ⚠️ 關鍵：匿名引入 PostgreSQL 驅動

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

	// =========================================================================
	// 🔌 1. 建立 PostgreSQL 資料庫連線
	// =========================================================================
	// backend/cmd/api/main.go

	// 1. 檢查有沒有 Docker 傳進來的環境變數 DB_HOST
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1" // 如果是在本地用 go run，預設連 127.0.0.1
	}

	// 2. 組合動態的 DSN
	dsn := fmt.Sprintf("host=%s port=5432 user=admin password=password123 dbname=smcdb sslmode=disable", dbHost)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()

	// 測試連線是否真的成功
	if err := db.Ping(); err != nil {
		logger.Fatal("failed to ping database", zap.Error(err))
	}
	logger.Info("✅ Successfully connected to PostgreSQL!")
	// =========================================================================

	// Repositories
	problemRepo := repository.NewProblemRepo(db)
	submissionRepo := repository.NewSubmissionRepo(db)

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
	mux.HandleFunc("GET /api/submissions", submissionH.List)
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