-- name: ListProblems :many
SELECT id, title, difficulty, description FROM problems ORDER BY id ASC;

-- name: GetProblemByID :one
SELECT id, title, difficulty, description FROM problems WHERE id = $1;

-- name: GetTestCasesByProblemID :many
SELECT id, input, expected_output FROM test_cases WHERE problem_id = $1 ORDER BY id ASC;

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

-- name: GetLatestSubmissionByProblem :one
SELECT id, problem_id, code, language, status, passed_test_cases, total_test_cases, 
       COALESCE(output, '') as output, COALESCE(expected_output, '') as expected_output, COALESCE(error, '') as error
FROM submissions
WHERE problem_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: CreateProblem :one
INSERT INTO problems (id, title, difficulty, description, time_limit_ms, memory_limit_kb)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: CreateTestCase :exec
INSERT INTO test_cases (id, problem_id, input, expected_output, is_hidden)
VALUES ($1, $2, $3, $4, $5);

-- name: ListSubmissionsByUserID :many
SELECT id, problem_id, language, status, passed_test_cases, total_test_cases, score, created_at
FROM submissions
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: GetCandidateScores :many
SELECT
    u.id        AS user_id,
    u.username,
    u.exam_started_at,
    COALESCE(SUM(s.score), 0)::int                                                AS total_score,
    COUNT(DISTINCT s.problem_id)::int                                             AS problems_attempted,
    COUNT(DISTINCT CASE WHEN s.status = 'Accepted' THEN s.problem_id END)::int   AS problems_accepted
FROM users u
LEFT JOIN submissions s ON u.id = s.user_id
WHERE u.role = 'candidate'
GROUP BY u.id, u.username, u.exam_started_at
ORDER BY total_score DESC;