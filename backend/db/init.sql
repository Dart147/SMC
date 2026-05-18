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

-- 寫入預設題目
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