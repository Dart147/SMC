package main

import (
	"context"
	"database/sql"  // 新增 sql 標準庫
	"encoding/json" // Serialize JSON responses (e.g., /api/version)
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // ⚠️ 關鍵：匿名引入 PostgreSQL 驅動
	"go.uber.org/zap"

	"github.com/Dart147/SMC/backend/internal/config"

	"github.com/Dart147/SMC/backend/internal/handler"
	"github.com/Dart147/SMC/backend/internal/judge"
	"github.com/Dart147/SMC/backend/internal/middleware"
	"github.com/Dart147/SMC/backend/internal/repository"
	"github.com/Dart147/SMC/backend/internal/seed"
	"github.com/Dart147/SMC/backend/internal/service"
	"github.com/Dart147/SMC/backend/internal/utils"
)

// Build-time commit and version strings returned by GET /api/version (see README "Build metadata")
var (
	CommitHash = "dev"
	Version    = "dev"
)

func main() {
	// 載入 .env 檔案
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  Warning: Error loading .env file")
	}

	utils.UsernameSecretKey = os.Getenv("USERNAME_HMAC_SECRET")
	if utils.UsernameSecretKey == "" {
		log.Fatal("❌ Missing USERNAME_HMAC_SECRET in environment")
	}

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
	defer func() { // close function warned by go-lint
		if err := logger.Sync(); err != nil {
			fmt.Fprintf(os.Stderr, "logger sync: %v\n", err)
		}
	}()

	// =========================================================================
	// 🔌 1. 建立 PostgreSQL 資料庫連線 (動態讀取環境變數)
	// =========================================================================

	// 依序讀取環境變數，若不存在則給予預設值 (確保本地直接 run 也不會崩潰)
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
		dbUser = "postgres"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "your_secure_db_password"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "smc"
	}

	// 組合動態的 DSN
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Fatal("failed to open database", zap.Error(err))
	}
	defer func() { // close function warned by go-lint
		if err := db.Close(); err != nil {
			logger.Warn("db close", zap.Error(err))
		}
	}()

	// 測試連線是否真的成功
	if err := db.Ping(); err != nil {
		logger.Fatal("failed to ping database", zap.Error(err))
	}
	logger.Info("Successfully connected to PostgreSQL!")

	seed.AdminUser(db)

	// =========================================================================

	// Repositories
	userRepo := repository.NewUserRepository(db)
	problemRepo := repository.NewProblemRepo(db)
	submissionRepo := repository.NewSubmissionRepo(db)

	// Services
	authSvc := service.NewAuthService(userRepo, os.Getenv("JWT_SECRET"))
	problemSvc := service.NewProblemService(problemRepo)

	var runner judge.Runner
	if os.Getenv("JUDGE_BACKEND") == "docker" {
		logger.Info("judge backend: docker (isolated containers)")
		runner = judge.NewDockerRunner(logger)
	} else {
		logger.Warn("judge backend: process (no isolation — development only)")
		runner = judge.NewProcessRunner(logger)
	}
	j := judge.NewJudge(runner, logger)
	submissionSvc := service.NewSubmissionService(submissionRepo, problemRepo, j, logger)

	// Handlers
	authH := handler.NewAuthHandler(authSvc)
	problemH := handler.NewProblemHandler(problemSvc)
	submissionH := handler.NewSubmissionHandler(submissionSvc)

	// Router (Go 1.22 pattern-based mux)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/healthz", handler.Health)
	// Exposes build metadata
	mux.HandleFunc("GET /api/version", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"commit":  CommitHash,
			"version": Version,
		})
	})

	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("POST /api/users", authH.CreateCandidate)
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
