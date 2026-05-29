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
	"github.com/Dart147/SMC/backend/internal/handler"
	"github.com/Dart147/SMC/backend/internal/judge"
	"github.com/Dart147/SMC/backend/internal/middleware"
	"github.com/Dart147/SMC/backend/internal/repository"
	"github.com/Dart147/SMC/backend/internal/seed"
	"github.com/Dart147/SMC/backend/internal/service"
	"github.com/Dart147/SMC/backend/internal/utils"
)

func main() {
	// 修正 1: 檢查 godotenv.Load 錯誤
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
	// 修正 2: 檢查 logger.Sync 錯誤
	defer func() { _ = logger.Sync() }()

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("DB_HOST", "127.0.0.1"), getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "admin"), getEnv("DB_PASSWORD", "password123"),
		getEnv("DB_NAME", "smcdb"))

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Fatal("failed to open database", zap.Error(err))
	}
	// 修正 3: 檢查 db.Close 錯誤
	defer func() { _ = db.Close() }()

	// 測試連線是否真的成功
	if err := db.Ping(); err != nil {
		logger.Fatal("failed to ping database", zap.Error(err))
	}
	logger.Info("Successfully connected to PostgreSQL!")

	jwtSecret := []byte(os.Getenv("JWT_SECRET")) 
	authMiddleware := middleware.RequireAuth(jwtSecret)

	seed.AdminUser(db)

	userRepo := repository.NewUserRepository(db)
	problemRepo := repository.NewProblemRepo(db)
	submissionRepo := repository.NewSubmissionRepo(db)
	reportRepo := repository.NewReportRepo(db)
	examRepo := repository.NewExamRepo(db)

	authSvc := service.NewAuthService(userRepo, os.Getenv("JWT_SECRET"))
	problemSvc := service.NewProblemService(problemRepo)
	reportSvc := service.NewReportService(reportRepo)
	examSvc := service.NewExamService(examRepo)

	var runner judge.Runner
	if os.Getenv("JUDGE_BACKEND") == "docker" {
		runner = judge.NewDockerRunner(logger)
	} else {
		runner = judge.NewProcessRunner(logger)
	}
	submissionSvc := service.NewSubmissionService(submissionRepo, problemRepo, judge.NewJudge(runner, logger), logger)

	authH := handler.NewAuthHandler(authSvc)
	problemH := handler.NewProblemHandler(problemSvc)
	submissionH := handler.NewSubmissionHandler(submissionSvc)
	reportH := handler.NewReportHandler(reportSvc)
	examH := handler.NewExamHandler(examSvc)

	mux := http.NewServeMux()

	// Health check used by docker-compose healthcheck and Traefik.
	mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = w.Write([]byte("ok\n"))
	})

	// Auth 相關
	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("POST /api/users", authH.CreateCandidate)
	mux.Handle("POST /api/exams/start", authMiddleware(http.HandlerFunc(examH.StartExam)))
	mux.Handle("POST /api/exams/warn", authMiddleware(http.HandlerFunc(examH.ReportWarning)))
	mux.Handle("POST /api/exams/end", authMiddleware(http.HandlerFunc(examH.EndExam)))

	// 題目相關
	mux.HandleFunc("GET /api/problems", problemH.List)
	mux.HandleFunc("GET /api/problems/{id}", problemH.GetByID)
	mux.HandleFunc("POST /api/problems", problemH.Create)

	// 提交相關
	mux.HandleFunc("GET /api/submissions", submissionH.List)
	mux.HandleFunc("GET /api/submissions/{id}", submissionH.GetByID)
	mux.HandleFunc("GET /api/submissions/latest", submissionH.GetLatest)
	mux.HandleFunc("POST /api/submissions", submissionH.Create)

	// 管理台報表
	mux.HandleFunc("GET /api/admin/submissions", submissionH.ListByUserID)
	mux.HandleFunc("GET /api/admin/candidates/scores", reportH.GetCandidateScores)

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: middleware.CORS(mux),
	}

	go func() {
		// 修正 5: 檢查 ListenAndServe 錯誤
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// 修正 6: 檢查 Shutdown 錯誤
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
