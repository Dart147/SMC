-- 1. 新增兩名測試使用者 (一名主管，一名面試者)
INSERT INTO users (username, password_hash, email, role) 
VALUES 
('admin_user', 'hashed_pass_123', 'admin@example.com', 'admin'),
('candidate_1', 'hashed_pass_456', 'candidate@example.com', 'candidate');

-- 2. 新增一道面試題目 (例如：Two Sum)
INSERT INTO questions (title, description, time_limit_ms, memory_limit_kb, difficulty)
VALUES 
('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 1000, 65536, 'Easy');

-- 3. 新增題目的兩筆測資 (針對 question_id = 1)
INSERT INTO test_cases (question_id, input_data, expected_output, is_hidden)
VALUES 
(1, '[2,7,11,15]\n9', '[0,1]', false),
(1, '[3,2,4]\n6', '[1,2]', true);

-- 4. 新增一筆面試者的程式碼提交紀錄 (狀態為 AC - Accepted)
INSERT INTO submissions (user_id, question_id, code, language, status, passed_test_cases, total_test_cases, execution_time_ms, memory_used_kb, score)
VALUES 
(2, 1, 'def twoSum(nums, target):\n    pass # code here', 'python', 'AC', 2, 2, 45, 14200, 100);

-- ==========================================
-- 測試查詢區 (把上面執行完後，可以把上面的註解掉，單獨選取下面某行執行看看結果)
-- ==========================================

-- 檢查所有使用者
-- SELECT * FROM users;

-- 檢查題目跟對應的測資 (Join 查詢)
-- SELECT q.title, t.input_data, t.expected_output 
-- FROM questions q 
-- JOIN test_cases t ON q.id = t.question_id;

-- 檢查面試者的成績紀錄
SELECT u.username, q.title, s.status, s.score, s.passed_test_cases
FROM submissions s
JOIN users u ON s.user_id = u.id
JOIN questions q ON s.question_id = q.id;