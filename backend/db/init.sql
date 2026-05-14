CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) DEFAULT 'candidate', -- 'candidate' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE problems (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    time_limit_ms INTEGER NOT NULL DEFAULT 5000, -- 根據 Spec: Process is killed after 5 seconds
    memory_limit_kb INTEGER NOT NULL DEFAULT 262144, -- 根據 Spec: 256 MB
    difficulty VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_cases (
    id VARCHAR(50) PRIMARY KEY,
    problem_id VARCHAR(50) REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL, -- 根據 Spec yaml: "input"
    expected_output TEXT NOT NULL, -- 根據 Spec yaml: "expected_output"
    is_hidden BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submissions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE, -- 目前 API 沒傳 userID，我們讓它保持可為 NULL 以相容
    problem_id VARCHAR(50) REFERENCES problems(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    passed_test_cases INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    output TEXT, -- 根據 Spec: actual stdout (WA/RE)
    expected_output TEXT, -- 根據 Spec: expected stdout (WA)
    error TEXT, -- 根據 Spec: error description/stderr (RE/CE/TLE/MLE)
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    score INTEGER DEFAULT 0,
    coding_style_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_problem_id ON submissions(problem_id);
