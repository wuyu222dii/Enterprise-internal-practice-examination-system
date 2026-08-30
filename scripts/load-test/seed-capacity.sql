-- CAP-01 capacity fixture: 5,000 employees, 50 departments, 10,000 questions,
-- 50,000 candidate versions (5 per question) in a single bank.
--
-- Requirement 17.2 forbids measuring the performance targets on a smaller dataset, so every
-- PERF-01..04 run must happen against this fixture.
--
-- Apply with:
--   docker exec -i exam_system-postgres-1 psql -U exam -d exam_system < scripts/load-test/seed-capacity.sql
--
-- Idempotent: re-running deletes and rebuilds the capacity rows. Attempts referencing the capacity
-- exam must be removed first, which the cleanup block below does.

BEGIN;

-- Cleanup in dependency order so the fixture can be rebuilt between runs.
DELETE FROM exam_answers WHERE exam_attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id LIKE 'exm_cap%');
DELETE FROM exam_results WHERE exam_attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id LIKE 'exm_cap%');
DELETE FROM exam_paper_items WHERE exam_attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id LIKE 'exm_cap%');
DELETE FROM exam_attempts WHERE exam_id LIKE 'exm_cap%';
DELETE FROM exam_assignments WHERE published_version_id IN (
    SELECT id FROM exam_published_versions WHERE exam_id LIKE 'exm_cap%');
DELETE FROM exam_rule_lines WHERE published_version_id IN (
    SELECT id FROM exam_published_versions WHERE exam_id LIKE 'exm_cap%');
DELETE FROM export_jobs WHERE exam_id LIKE 'exm_cap%';
UPDATE exams SET published_version_id = NULL WHERE id LIKE 'exm_cap%';
DELETE FROM exam_published_versions WHERE exam_id LIKE 'exm_cap%';
DELETE FROM exams WHERE id LIKE 'exm_cap%';

DELETE FROM wrong_book_entries WHERE question_version_id LIKE 'qv_cap%';
DELETE FROM question_versions WHERE id LIKE 'qv_cap%';
DELETE FROM questions WHERE id LIKE 'q_cap%';
DELETE FROM categories WHERE question_bank_id = 'qb_cap';
DELETE FROM question_banks WHERE id = 'qb_cap';

DELETE FROM employees WHERE id LIKE 'emp_cap%';
DELETE FROM departments WHERE id LIKE 'dept_cap%';

-- 50 departments under the bootstrap root.
INSERT INTO departments (id, name, parent_id, path, status)
SELECT 'dept_cap_' || g, '压测部门' || g, 'dept_root', '/总公司/压测部门' || g, 'active'
FROM generate_series(1, 50) AS g;

-- 5,000 employees, password Admin@123, no forced password change so load scripts can log straight in.
INSERT INTO employees (
    id, employee_no, display_name, department_id, phone, password_hash,
    status, is_admin, has_outage_disposition, must_change_password, failed_login_count
)
SELECT
    'emp_cap_' || g,
    'CAP' || lpad(g::text, 5, '0'),
    '压测员工' || g,
    'dept_cap_' || (1 + (g - 1) % 50),
    NULL,
    '$2a$10$EDmuNZQg5Gx2Eur..7aI2e/gMbowNf3EqcpZ8YRYVWSJxOXL0FeXa',
    'active', FALSE, FALSE, FALSE, 0
FROM generate_series(1, 5000) AS g;

-- Reset the bootstrap admin to a known password so the load-test scripts do not depend on whatever
-- an earlier interactive session left behind. Load fixture only; never run against production.
UPDATE employees
SET password_hash = '$2a$10$EDmuNZQg5Gx2Eur..7aI2e/gMbowNf3EqcpZ8YRYVWSJxOXL0FeXa',
    must_change_password = FALSE,
    failed_login_count = 0,
    locked_until = NULL
WHERE employee_no = 'ADMIN001';

INSERT INTO question_banks (id, name, status, practice_enabled, mock_enabled)
VALUES ('qb_cap', '容量压测题库', 'active', TRUE, TRUE);

-- 50 categories so the 50 rule lines can each target a distinct slice.
INSERT INTO categories (id, question_bank_id, name)
SELECT 'cat_cap_' || g, 'qb_cap', '压测分类' || g
FROM generate_series(1, 50) AS g;

-- 10,000 questions spread evenly across the 50 categories.
INSERT INTO questions (id, question_bank_id, category_id, status)
SELECT 'q_cap_' || g, 'qb_cap', 'cat_cap_' || (1 + (g - 1) % 50), 'active'
FROM generate_series(1, 10000) AS g;

-- 5 versions per question = 50,000 candidate versions; only the highest version_no is drawn.
INSERT INTO question_versions (
    id, question_id, version_no, type, stem,
    options_json, standard_answer, explanation, difficulty, default_score, status
)
SELECT
    'qv_cap_' || q || '_' || v,
    'q_cap_' || q,
    v,
    'singleChoice',
    '压测题 ' || q || ' 版本 ' || v,
    '[{"key":"A","text":"选项A"},{"key":"B","text":"选项B"},{"key":"C","text":"选项C"},{"key":"D","text":"选项D"}]'::jsonb,
    '["B"]'::jsonb,
    '压测题解析',
    'medium',
    1,
    'active'
FROM generate_series(1, 10000) AS q, generate_series(1, 5) AS v;

COMMIT;

ANALYZE departments;
ANALYZE employees;
ANALYZE questions;
ANALYZE question_versions;

SELECT
    (SELECT count(*) FROM employees WHERE id LIKE 'emp_cap%') AS employees,
    (SELECT count(*) FROM departments WHERE id LIKE 'dept_cap%') AS departments,
    (SELECT count(*) FROM questions WHERE id LIKE 'q_cap%') AS questions,
    (SELECT count(*) FROM question_versions WHERE id LIKE 'qv_cap%') AS versions;
