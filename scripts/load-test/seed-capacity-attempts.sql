-- PERF-04 fixture: 2,000 assignees x 10 completed attempts = 20,000 attempt rows
-- plus matching official results. Paper items are omitted; export only needs
-- attempts, results and assignment snapshots.
--
-- Usage (after setup-capacity-exam.sh):
--   EXAM_ID=exm_xxx docker exec -i exam_system-postgres-1 \
--     psql -U exam -d exam_system -v exam_id="$EXAM_ID" \
--     -f - < scripts/load-test/seed-capacity-attempts.sql
--
-- Or pass the exam id inline:
--   docker exec -i exam_system-postgres-1 psql -U exam -d exam_system \
--     -c "\set exam_id 'exm_xxx'" -f /dev/stdin < scripts/load-test/seed-capacity-attempts.sql

BEGIN;

DELETE FROM exam_results WHERE exam_attempt_id IN (
    SELECT id FROM exam_attempts WHERE exam_id = :'exam_id' AND id LIKE 'eat_cap%');
DELETE FROM exam_answers WHERE exam_attempt_id IN (
    SELECT id FROM exam_attempts WHERE exam_id = :'exam_id' AND id LIKE 'eat_cap%');
DELETE FROM exam_paper_items WHERE exam_attempt_id IN (
    SELECT id FROM exam_attempts WHERE exam_id = :'exam_id' AND id LIKE 'eat_cap%');
DELETE FROM exam_attempts WHERE exam_id = :'exam_id' AND id LIKE 'eat_cap%';

INSERT INTO exam_attempts (
    id, exam_id, employee_id, published_version_id, attempt_number,
    attempt_status, started_at, expires_at, submitted_at, submit_reason,
    voided, compensation_seconds
)
SELECT
    'eat_cap_' || emp || '_' || n,
    e.id,
    'emp_cap_' || emp,
    e.published_version_id,
    n,
    'completed',
    NOW() - ((11 - n) || ' hours')::interval,
    NOW() - ((11 - n) || ' hours')::interval + INTERVAL '2 hours',
    NOW() - ((11 - n) || ' hours')::interval + INTERVAL '45 minutes',
    'manual',
    FALSE,
    0
FROM exams e
CROSS JOIN generate_series(1, 2000) AS emp
CROSS JOIN generate_series(1, 10) AS n
WHERE e.id = :'exam_id';

INSERT INTO exam_results (id, exam_attempt_id, total_score, max_score, passed, detail_json, official_valid)
SELECT
    'ers_cap_' || emp || '_' || n,
    'eat_cap_' || emp || '_' || n,
    (50 + (emp + n) % 50)::numeric,
    100,
    ((50 + (emp + n) % 50) >= 60),
    '[]'::jsonb,
    TRUE
FROM generate_series(1, 2000) AS emp
CROSS JOIN generate_series(1, 10) AS n;

COMMIT;

SELECT
    (SELECT count(*) FROM exam_assignments a
       JOIN exam_published_versions v ON v.id = a.published_version_id
      WHERE v.exam_id = :'exam_id') AS assignments,
    (SELECT count(*) FROM exam_attempts WHERE exam_id = :'exam_id') AS attempts,
    (SELECT count(*) FROM exam_results r
       JOIN exam_attempts a ON a.id = r.exam_attempt_id
      WHERE a.exam_id = :'exam_id') AS results;
