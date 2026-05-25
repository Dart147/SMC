package main

import (
	"context"
	"database/sql"
	//"encoding/json"
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

var (
	CommitHash = "dev"
	Version    = "dev"
)

func main() {
	godotenv.Load()

	utils.UsernameSecretKey = os.Getenv("USERNAME_HMAC_SECRET")
	if utils.UsernameSecretKey == "" {
		log.Fatal("❌ Missing USERNAME_HMAC_SECRET in environment")
	}

	cfg, err := config.Load("configs/config.yaml")
	if err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		os.Exit(1)
	}

	logger, _ := buildLogger(cfg.LogLevel)
	defer logger.Sync()

	// 🔌 資料庫設定：優先讀取環境變數，若無則使用本地設定
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "admin"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password123"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "smcdb"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Fatal("failed to open database", zap.Error(err))
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		logger.Fatal("failed to ping database", zap.Error(err))
	}
	logger.Info("Successfully connected to PostgreSQL!")

	internaldb.SeedAdminUser(db)

	// Repositories & Services & Handlers (維持原本結構)
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
	j := judge.NewJudge(runner, logger)
	submissionSvc := service.NewSubmissionService(submissionRepo, problemRepo, j, logger)

	authH := handler.NewAuthHandler(authSvc)
	problemH := handler.NewProblemHandler(problemSvc)
	submissionH := handler.NewSubmissionHandler(submissionSvc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/healthz", handler.Health)
	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("POST /api/users", authH.CreateCandidate)
	mux.HandleFunc("GET /api/problems", problemH.List)
	mux.HandleFunc("GET /api/problems/{id}", problemH.GetByID)
	mux.HandleFunc("POST /api/problems", problemH.Create)
	mux.HandleFunc("GET /api/submissions", submissionH.List)
	mux.HandleFunc("POST /api/submissions", submissionH.Create)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: middleware.CORS(mux),
	}

	go func() {
		logger.Info("server starting", zap.Int("port", cfg.Port))
		srv.ListenAndServe()
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

func buildLogger(level string) (*zap.Logger, error) {
	if level == "debug" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
