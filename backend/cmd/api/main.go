package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "strconv"
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
    "github.com/Dart147/SMC/backend/internal/worker"
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

    if err := db.Ping(); err != nil {
        logger.Fatal("failed to ping database", zap.Error(err))
    }
    logger.Info("Successfully connected to PostgreSQL!")

    jwtSecret := []byte(os.Getenv("JWT_SECRET"))
    authMiddleware := middleware.RequireAuth(jwtSecret)

    seed.AdminUser(db)

    // 初始化 Repositories
    userRepo := repository.NewUserRepository(db)
    problemRepo := repository.NewProblemRepo(db)
    submissionRepo := repository.NewSubmissionRepo(db)
    reportRepo := repository.NewReportRepo(db)
    examRepo := repository.NewExamRepo(db)

    // 初始化 Services
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

    // 初始化 Handlers
    authH := handler.NewAuthHandler(authSvc)
    problemH := handler.NewProblemHandler(problemSvc)
    submissionH := handler.NewSubmissionHandler(submissionSvc)
    reportH := handler.NewReportHandler(reportSvc)
    examH := handler.NewExamHandler(examSvc)
    interviewerH := handler.NewInterviewerHandler(db)

    mux := http.NewServeMux()

    // 健康檢查
    mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, _ *http.Request) {
        w.Header().Set("Content-Type", "text/plain")
        _, _ = w.Write([]byte("ok\n"))
    })

    // Auth 路由
    mux.HandleFunc("POST /api/auth/login", authH.Login)
    mux.HandleFunc("POST /api/users", authH.CreateCandidate)
    
    // 🌟 考試與誠實度警告路由 (需登入)
    mux.Handle("POST /api/exams/start", authMiddleware(http.HandlerFunc(examH.StartExam)))
    mux.Handle("POST /api/exams/warn", authMiddleware(http.HandlerFunc(examH.ReportWarning))) // 前端 apiClient.post("/exams/warn") 會打到這
    mux.Handle("POST /api/exams/end", authMiddleware(http.HandlerFunc(examH.EndExam)))
    
    // 增加一個 Alias 以防前端寫法不同
    mux.Handle("POST /api/user/warning", authMiddleware(http.HandlerFunc(examH.ReportWarning)))

    // 題目路由
    mux.HandleFunc("GET /api/problems", problemH.List)
    mux.HandleFunc("GET /api/problems/{id}", problemH.GetByID)
    mux.HandleFunc("POST /api/problems", problemH.Create)

    // 提交路由 (需登入)
    mux.Handle("GET /api/submissions", authMiddleware(http.HandlerFunc(submissionH.List)))
    mux.Handle("GET /api/submissions/{id}", authMiddleware(http.HandlerFunc(submissionH.GetByID)))
    mux.Handle("GET /api/submissions/latest", authMiddleware(http.HandlerFunc(submissionH.GetLatest)))
    mux.Handle("POST /api/submissions", authMiddleware(http.HandlerFunc(submissionH.Create)))

    // 管理者/面試官專用路由
    mux.HandleFunc("GET /api/admin/submissions", submissionH.ListByUserID)
    mux.HandleFunc("GET /api/admin/candidates/scores", reportH.GetCandidateScores)
    mux.HandleFunc("GET /api/submissions/{id}/report", submissionH.GetReport) 
    mux.HandleFunc("GET /api/interviewer/candidates", interviewerH.GetCandidates)

    srv := &http.Server{
        Addr:    fmt.Sprintf(":%d", cfg.Port),
        Handler: middleware.CORS(mux),
    }

    // 啟動背景 Worker 處理評測
    if err := submissionRepo.RecoverStalled(context.Background()); err != nil {
        logger.Warn("failed to recover stalled submissions", zap.Error(err))
    }

    workerCtx, stopWorkers := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stopWorkers()

    workerCount := 4
    if v := os.Getenv("WORKER_COUNT"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 {
            workerCount = n
        }
    }
    pool := worker.NewPool(submissionSvc, workerCount)
    pool.Start(workerCtx)

    // 啟動 HTTP Server
    go func() {
        logger.Info("Starting server", zap.Int("port", cfg.Port))
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            logger.Error("server error", zap.Error(err))
        }
    }()

    <-workerCtx.Done()
    stopWorkers()

    shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := srv.Shutdown(shutCtx); err != nil {
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