INSERT INTO users (id, username, password_hash, email, role) 
VALUES 
('usr_001', 'admin_user', 'hashed_pass_123', 'admin@example.com', 'admin'),
('usr_002', 'candidate_1', 'hashed_pass_456', 'candidate@example.com', 'candidate');

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

INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden)
VALUES 
('tc_001', '1', '2 7 11 15\n9\n', '0 1\n', false),
('tc_002', '1', '3 2 4\n6\n', '1 2\n', true);

INSERT INTO submissions (id, user_id, problem_id, code, language, status, passed_test_cases, total_test_cases, output, expected_output, error, execution_time_ms, memory_used_kb, score)
VALUES 
('a3f8c2d1e4b5f6a7', 'usr_002', '1', 'nums=list(map(int,input().split()))\nt=int(input())', 'python', 'Accepted', 2, 2, NULL, NULL, NULL, 45, 14200, 100),
('err123456789abcd', NULL, '1', 'print("wrong")', 'python', 'Wrong Answer', 0, 2, 'wrong\n', '0 1\n', NULL, 30, 12000, 0);
