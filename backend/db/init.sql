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
('1', 'Two Sum', 'Easy', 'Given an integer array and a target value, return the **two indices** (0-based, in ascending order) of the two numbers that add up to the target. Each input has exactly one valid solution.

### Input Format
- Line 1: space-separated integers (the array)
- Line 2: the target integer

### Output Format
- A single line with two space-separated 0-based indices in ascending order

### Constraints
- 2 ≤ n ≤ 10,000
- −10⁹ ≤ nums[i] ≤ 10⁹
- −10⁹ ≤ target ≤ 10⁹
- Exactly one valid answer exists

### Examples

**Example 1**
```
Input:
2 7 11 15
9

Output:
0 1
```
*nums[0] + nums[1] = 2 + 7 = 9*

**Example 2**
```
Input:
3 2 4
6

Output:
1 2
```
*nums[1] + nums[2] = 2 + 4 = 6*'),
('2', 'Add Two Numbers', 'Medium', E'You are given two non-negative integers represented as linked lists. The digits are stored in **reverse order** (ones digit first). Add the two numbers and return the result as a linked list in reverse order.\n\n### Input Format\n- Line 1: space-separated digits of the first number in **reverse order** (e.g., `2 4 3` represents 342)\n- Line 2: space-separated digits of the second number in **reverse order** (e.g., `5 6 4` represents 465)\n\n### Output Format\n- Space-separated digits of the sum in **reverse order** (e.g., `7 0 8` represents 807)\n\n### Constraints\n- Each list has 1 to 100 nodes\n- 0 ≤ digit ≤ 9\n- No leading zeros except for the number 0 itself\n\n### Examples\n\n**Example 1**\n```\nInput:\n2 4 3\n5 6 4\n\nOutput:\n7 0 8\n```\n*342 + 465 = 807*\n\n**Example 2**\n```\nInput:\n9 9 9 9 9 9 9\n9 9 9 9\n\nOutput:\n8 9 9 9 0 0 0 1\n```\n*9999999 + 9999 = 10009998*'),
('3', 'Longest Substring Without Repeating Characters', 'Medium', E'Given a string `s`, find the length of the **longest substring** that contains no repeating characters.\n\n### Input Format\n- A single line containing the string `s`\n\n### Output Format\n- A single integer — the length of the longest substring without repeating characters\n\n### Constraints\n- 0 ≤ s.length ≤ 50,000\n- `s` may contain English letters, digits, symbols, and spaces\n\n### Examples\n\n**Example 1**\n```\nInput:\nabcabcbb\n\nOutput:\n3\n```\n*The longest substring without repeating characters is `abc` (length 3)*\n\n**Example 2**\n```\nInput:\nbbbbb\n\nOutput:\n1\n```\n*Every character repeats; the best we can do is a single `b`*\n\n**Example 3**\n```\nInput:\npwwkew\n\nOutput:\n3\n```\n*`wke` is the longest such substring (not `kew` — both have length 3, either is acceptable)*'),
('4', 'Valid Parentheses', 'Easy', E'Given a string containing only `(`, `)`, `{`, `}`, `[`, and `]`, determine if it is **valid**.\n\nA string is valid if:\n1. Every open bracket is closed by the **same type** of bracket.\n2. Open brackets are closed in the **correct order**.\n3. Every close bracket has a corresponding open bracket.\n\n### Input Format\n- A single line containing the bracket string\n\n### Output Format\n- Print `true` if valid, `false` otherwise\n\n### Constraints\n- 1 ≤ s.length ≤ 10,000\n- `s` consists only of `(`, `)`, `{`, `}`, `[`, `]`\n\n### Examples\n\n**Example 1**\n```\nInput:\n()[]{}\n\nOutput:\ntrue\n```\n\n**Example 2**\n```\nInput:\n([)]\n\nOutput:\nfalse\n```\n*`(` is not closed before `[` is closed*\n\n**Example 3**\n```\nInput:\n{[]}\n\nOutput:\ntrue\n```'),
('5', 'Maximum Depth of Binary Tree', 'Easy', E'Given the root of a binary tree, return its **maximum depth** — the number of nodes along the longest path from the root down to the farthest leaf.\n\n### Input Format\n- A single line of **space-separated values** in BFS (level-order) traversal order\n- Use the keyword `null` for a missing child node\n- Trailing `null` values may be omitted\n\n### Output Format\n- A single integer — the maximum depth of the tree\n\n### Constraints\n- 0 ≤ number of nodes ≤ 10,000\n- −100 ≤ Node.val ≤ 100\n- An empty tree (no input / single `null`) has depth 0\n\n### Examples\n\n**Example 1**\n```\nInput:\n3 9 20 null null 15 7\n\nOutput:\n3\n```\n*Tree structure: root 3, children 9 and 20, 20 has children 15 and 7. Depth = 3*\n\n**Example 2**\n```\nInput:\n1 null 2\n\nOutput:\n2\n```\n*Root 1 has no left child; right child is 2. Depth = 2*\n\n**Example 3**\n```\nInput:\n1 2 null 3\n\nOutput:\n3\n```\n*Root 1 → left child 2 → left child 3. Depth = 3*');

-- 25 seed test cases: 5 per problem (first case visible, rest hidden)
INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden)
VALUES
('tc_001', '1', '2 7 11 15\n9\n',    '0 1\n', false), -- NOSONAR
('tc_002', '1', '3 2 4\n6\n',        '1 2\n', true),
('tc_003', '1', '3 3\n6\n',          '0 1\n', true),
('tc_004', '1', '1 2 3 4 5\n9\n',    '3 4\n', true),
('tc_005', '1', '-3 3 1 -1\n0\n',    '0 1\n', true),
('tc_006', '2', '2 4 3\n5 6 4\n',              '7 0 8\n',          false),
('tc_007', '2', '0\n0\n',                       '0\n',              false),
('tc_008', '2', '9 9 9 9 9 9 9\n9 9 9 9\n',    '8 9 9 9 0 0 0 1\n', true),
('tc_009', '2', '1 0 0\n9 9 9\n',              '0 0 0 1\n',        true),
('tc_010', '2', '5\n5\n',                       '0 1\n',            true),
('tc_011', '3', 'abcabcbb\n', '3\n', false),
('tc_012', '3', 'bbbbb\n',    '1\n', false),
('tc_013', '3', 'pwwkew\n',   '3\n', true),
('tc_014', '3', 'a\n',        '1\n', true),
('tc_015', '3', 'dvdf\n',     '3\n', true),
('tc_016', '4', '()[]{}\n', 'true\n',  false), -- NOSONAR
('tc_017', '4', '()\n',     'true\n',  false),
('tc_018', '4', '(]\n',     'false\n', true),
('tc_019', '4', '([)]\n',   'false\n', true),
('tc_020', '4', '{[]}\n',   'true\n',  true),
('tc_021', '5', '3 9 20 null null 15 7\n', '3\n', false),
('tc_022', '5', '1 null 2\n',              '2\n', false),
('tc_023', '5', '1\n',                     '1\n', true),
('tc_024', '5', '1 2 3 4 5 6 7\n',        '3\n', true),
('tc_025', '5', '1 2 null 3\n',            '3\n', true);
