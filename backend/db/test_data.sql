INSERT INTO users (id, username, password_hash, email, role) 
VALUES 
('usr_001', 'admin_user', 'hashed_pass_123', 'admin@example.com', 'admin'),
('usr_002', 'candidate_1', 'hashed_pass_456', 'candidate@example.com', 'candidate');

INSERT INTO problems (id, title, description, time_limit_ms, memory_limit_kb, difficulty)
VALUES 
('1', 'Two Sum', 'Given an array of integers nums and an integer target...', 5000, 262144, 'Easy');

INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden)
VALUES 
('tc_001', '1', '2 7 11 15\n9\n', '0 1\n', false),
('tc_002', '1', '3 2 4\n6\n', '1 2\n', true);

INSERT INTO submissions (id, user_id, problem_id, code, language, status, passed_test_cases, total_test_cases, output, expected_output, error, execution_time_ms, memory_used_kb, score)
VALUES 
('a3f8c2d1e4b5f6a7', 'usr_002', '1', 'nums=list(map(int,input().split()))\nt=int(input())', 'python', 'Accepted', 2, 2, NULL, NULL, NULL, 45, 14200, 100),
('err123456789abcd', NULL, '1', 'print("wrong")', 'python', 'Wrong Answer', 0, 2, 'wrong\n', '0 1\n', NULL, 30, 12000, 0);
