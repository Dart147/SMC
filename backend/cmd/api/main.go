package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/config"
	internaldb "github.com/Dart147/SMC/backend/internal/db"
	"github.com/Dart147/SMC/backend/internal/handler"
	"github.com/Dart147/SMC/backend/internal/judge"
	"github.com/Dart147/SMC/backend/internal/middleware"
	"github.com/Dart147/SMC/backend/internal/repository"
	"github.com/Dart147/SMC/backend/internal/service"
	"github.com/Dart147/SMC/backend/internal/utils"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	utils.UsernameSecretKey = os.Getenv("USERNAME_HMAC_SECRET")
	if utils.UsernameSecretKey == "" {
		log.Fatal("❌ Missing USERNAME_HMAC_SECRET")
	}

	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		os.Exit(1)
	}

	logger, _ := buildLogger(cfg.LogLevel)
	defer func() { _ = logger.Sync() }()

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "127.0.0.1"), getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "admin"), getEnv("DB_PASSWORD", "password123"),
		getEnv("DB_NAME", "smcdb"))

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Fatal("failed to open database", zap.Error(err))
	}
	defer func() { _ = db.Close() }()

	internaldb.SeedAdminUser(db)

	userRepo := repository.NewUserRepository(db)
	problemRepo := repository.NewProblemRepo(db)
	submissionRepo := repository.NewSubmissionRepo(db)
	authSvc := service.NewAuthService(userRepo, os.Getenv("JWT_SECRET"))
	problemSvc := service.NewProblemService(problemRepo)

	var runner judge.Runner
	if os.Getenv("JUDGE_BACKEND") == "docker" {
		runner = judge.NewDockerRunner(logger)
	} else {
		runner = judge.NewProcessRunner(logger)
	}
	submissionSvc := service.NewSubmissionService(submissionRepo, problemRepo, judge.NewJudge(runner, logger), logger)

	problemH := handler.NewProblemHandler(problemSvc)
	authH := handler.NewAuthHandler(authSvc)
	submissionH := handler.NewSubmissionHandler(submissionSvc)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/problems", problemH.Create)
	mux.HandleFunc("GET /api/problems", problemH.List)
	mux.HandleFunc("GET /api/problems/{id}", problemH.GetByID)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: middleware.CORS(mux),
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", zap.Error(err))
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func buildLogger(level string) (*zap.Logger, error) {
	if level == "debug" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
