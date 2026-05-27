-- name: ListProblems :many
SELECT id, title, difficulty, description FROM problems ORDER BY id ASC;

-- name: GetProblemByID :one
SELECT id, title, difficulty, description FROM problems WHERE id = $1;

-- name: CreateSubmission :exec
INSERT INTO submissions (id, problem_id, code, language, status, passed_test_cases, total_test_cases)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetSubmissionByID :one
SELECT id, problem_id, code, language, status, passed_test_cases, total_test_cases, 
       COALESCE(output, '') as output, COALESCE(expected_output, '') as expected_output, COALESCE(error, '') as error
FROM submissions
WHERE id = $1;

-- name: UpdateSubmission :execrows
UPDATE submissions 
SET status = $1, 
    passed_test_cases = $2, 
    output = $3, 
    expected_output = $4, 
    error = $5
WHERE id = $6;

-- name: ListSubmissions :many
SELECT id, problem_id, code, language, status, passed_test_cases, total_test_cases, 
       COALESCE(output, '') as output, COALESCE(expected_output, '') as expected_output, COALESCE(error, '') as error
FROM submissions
ORDER BY created_at DESC;

-- name: CreateProblem :exec
INSERT INTO problems (id, title, description, time_limit_ms, memory_limit_kb, difficulty) 
VALUES ($1, $2, $3, $4, $5, $6);

-- name: CreateTestCase :exec
INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden)
VALUES ($1, $2, $3, $4, $5);

-- name: ListSubmissionsByUserID :many
SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetCandidateScores :many
SELECT problem_id, MAX(score) as best_score 
FROM submissions 
WHERE user_id = $1 
GROUP BY problem_id;

-- name: GetUserByUsername :one
SELECT id, username, password_hash, email, role FROM users WHERE username = $1;