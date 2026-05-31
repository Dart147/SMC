-- 1. Users 表：增加 totp_secret 並擴大 username 長度
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    -- ⚠️ 重要：HMAC-SHA256 產生的 Hex 字串長度是 64，所以不能只用 VARCHAR(50)
    username VARCHAR(255) UNIQUE NOT NULL, 
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'candidate', -- 'candidate' or 'admin'
    totp_secret VARCHAR(255),             -- 為了之後的兩步驟驗證 (MFA) 預留
    exam_started_at TIMESTAMP DEFAULT NULL, -- 記錄考生第一次登入（開始考試）的時間
    exam_ended_at TIMESTAMP DEFAULT NULL,   -- 記錄交卷時間 (Anti-Cheat)
    warning_count INT NOT NULL DEFAULT 0,   -- 防弊違規次數 (Anti-Cheat)
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE, -- 是否標記為作弊嫌疑 (Anti-Cheat)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Problems 表：修正註解亂碼
CREATE TABLE problems (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    time_limit_ms INTEGER NOT NULL DEFAULT 5000,     -- 根據 Spec: 預設 5 秒
    memory_limit_kb INTEGER NOT NULL DEFAULT 262144, -- 根據 Spec: 預設 256 MB
    difficulty VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Test Cases 表：修正註解亂碼
CREATE TABLE test_cases (
    id VARCHAR(50) PRIMARY KEY,
    problem_id VARCHAR(50) REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,           -- 根據 Spec yaml: "input"
    expected_output TEXT NOT NULL, -- 根據 Spec yaml: "expected_output"
    is_hidden BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Submissions 表：修正註解亂碼與明確 Nullable 狀態
CREATE TABLE submissions (
    id VARCHAR(50) PRIMARY KEY,
    -- 目前 API 若沒傳 userID，此欄位允許為 NULL (因為沒寫 NOT NULL)
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE, 
    problem_id VARCHAR(50) REFERENCES problems(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    passed_test_cases INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    output TEXT,          -- 根據 Spec: 實際 stdout (WA/RE)
    expected_output TEXT, -- 根據 Spec: 預期 stdout (WA)
    error TEXT,           -- 根據 Spec: error description/stderr (RE/CE/TLE/MLE)
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    score INTEGER DEFAULT 0,
    coding_style_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX idx_submissions_queue ON submissions(status, created_at ASC)
  WHERE status IN ('Pending', 'Judging');