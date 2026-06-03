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

-- 5. User Problem Assignments 表：記錄面試官指派給考生的題目
CREATE TABLE user_problem_assignments (
    user_id    VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    problem_id VARCHAR(50) REFERENCES problems(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, problem_id)
);

CREATE INDEX idx_assignments_user_id ON user_problem_assignments(user_id);
-- Seed problems (admin user is seeded by the backend on first startup)
INSERT INTO problems (id, title, difficulty, description) VALUES
('1', 'Two Sum', 'Easy', 'Given a list of integers and a target, print the two indices (0-based, in ascending order) that add up to the target. Each input has exactly one solution.

**Input format:**
- Line 1: space-separated integers (the array)
- Line 2: target integer

**Output format:**
- Two space-separated indices

**Example:**

```

Input:
2 7 11 15
9
Output:
0 1

```'),
('2', 'Add Two Numbers', 'Medium', 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

**Example:**

```

Input: l1 = [2,4,3], l2 = [5,6,4]
Output: [7,0,8]
Explanation: 342 + 465 = 807.

```'),
('3', 'Longest Substring Without Repeating Characters', 'Medium', 'Given a string `s`, find the length of the longest substring without repeating characters.

**Example:**

```

Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.

```'),
('4', 'Valid Parentheses', 'Easy', 'Given a string containing only ''('', '')'', ''{'', ''}'', ''['' and '']'', determine if it is valid.

A string is valid if open brackets are closed by the same type and in the correct order.

**Input format:**
- Line 1: the bracket string

**Output format:**
- Print `true` or `false`

**Example:**

```

Input: ()[]{}
Output: true

```'),
('5', 'Maximum Depth of Binary Tree', 'Easy', 'Given the root of a binary tree, return its maximum depth.

A binary tree''s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

**Example:**

```

Input: root = [3,9,20,null,null,15,7]
Output: 3

```');

INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden)
VALUES
('tc_001', '1', '2 7 11 15\n9\n', '0 1\n', false),
('tc_002', '1', '3 2 4\n6\n',     '1 2\n', true);
