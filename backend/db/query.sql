-- name: ListProblems :many
SELECT id, title, difficulty, description FROM problems ORDER BY id ASC;

-- name: GetProblemByID :one
SELECT id, title, difficulty, description FROM problems WHERE id = $1;

-- name: GetTestCasesByProblemID :many
SELECT id, input, expected_output FROM test_cases WHERE problem_id = $1 ORDER BY id ASC;

-- name: CreateSubmission :exec
INSERT INTO submissions (id, problem_id, user_id, code, language, status, passed_test_cases, total_test_cases)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- name: GetSubmissionByID :one
SELECT id, problem_id, user_id, code, language, status, passed_test_cases, total_test_cases,
       COALESCE(execution_time_ms, 0) as execution_time_ms,
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
SELECT id, problem_id, user_id, code, language, status, passed_test_cases, total_test_cases,
       COALESCE(execution_time_ms, 0) as execution_time_ms,
       COALESCE(output, '') as output, COALESCE(expected_output, '') as expected_output, COALESCE(error, '') as error
FROM submissions
ORDER BY created_at DESC;

-- name: GetLatestSubmissionByProblem :one
SELECT id, problem_id, user_id, code, language, status, passed_test_cases, total_test_cases,
       COALESCE(execution_time_ms, 0) as execution_time_ms,
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
    CASE
        WHEN COUNT(DISTINCT upa.problem_id) = 0 THEN 0
        ELSE ROUND(
            COUNT(DISTINCT CASE WHEN s.status = 'Accepted' THEN upa.problem_id END)::numeric
            * 100
            / COUNT(DISTINCT upa.problem_id)
        )::int
    END                                                                           AS total_score,
    COUNT(DISTINCT upa.problem_id)::int                                           AS problems_attempted,
    COUNT(DISTINCT CASE WHEN s.status = 'Accepted' THEN upa.problem_id END)::int AS problems_accepted
FROM users u
LEFT JOIN user_problem_assignments upa ON u.id = upa.user_id
LEFT JOIN submissions s ON s.user_id = u.id AND s.problem_id = upa.problem_id
WHERE u.role = 'candidate'
GROUP BY u.id, u.username, u.exam_started_at
ORDER BY total_score DESC;

-- name: ClaimNextPendingSubmission :one
WITH next_job AS (
  SELECT id FROM submissions
  WHERE status = 'Pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE submissions
SET status = 'Judging'
FROM next_job
WHERE submissions.id = next_job.id
RETURNING submissions.id,
          submissions.problem_id,
          submissions.user_id,
          submissions.code,
          submissions.language,
          submissions.status,
          submissions.passed_test_cases,
          submissions.total_test_cases,
          COALESCE(submissions.execution_time_ms, 0) as execution_time_ms,
          COALESCE(submissions.output, '') as output,
          COALESCE(submissions.expected_output, '') as expected_output,
          COALESCE(submissions.error, '') as error;

-- name: RecoverStalledSubmissions :exec
UPDATE submissions SET status = 'Pending' WHERE status = 'Judging';

-- name: StartExam :one
UPDATE users 
SET exam_started_at = COALESCE(exam_started_at, NOW()) 
WHERE id = $1 
RETURNING exam_started_at;

-- name: IncrementWarning :one
UPDATE users 
SET warning_count = warning_count + 1, is_suspicious = TRUE 
WHERE id = $1 
RETURNING warning_count;

-- name: EndExam :one
UPDATE users 
SET exam_ended_at = NOW() 
WHERE id = $1 
RETURNING exam_ended_at;

-- name: GetSubmissionReport :one
SELECT 
    s.id, 
    s.problem_id, 
    s.user_id, 
    s.code, 
    s.language, 
    s.status, 
    s.passed_test_cases, 
    s.total_test_cases,
    s.score,
    s.created_at,
    u.username, 
    u.warning_count, 
    u.is_suspicious
FROM submissions s
JOIN users u ON s.user_id = u.id
WHERE s.id = $1;

-- name: AssignProblem :exec
INSERT INTO user_problem_assignments (user_id, problem_id)
VALUES ($1, $2)
ON CONFLICT (user_id, problem_id) DO NOTHING;

-- name: UnassignProblem :exec
DELETE FROM user_problem_assignments
WHERE user_id = $1 AND problem_id = $2;

-- name: GetAssignedProblems :many
SELECT p.id, p.title, p.difficulty, p.description
FROM problems p
INNER JOIN user_problem_assignments upa ON p.id = upa.problem_id
WHERE upa.user_id = $1
ORDER BY p.id ASC;

-- name: GetAssignedProblemIDs :many
SELECT problem_id
FROM user_problem_assignments
WHERE user_id = $1
ORDER BY problem_id ASC;
