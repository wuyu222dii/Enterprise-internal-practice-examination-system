-- I25: fill demo archive phones only when still empty (do not overwrite admin-set numbers)
UPDATE employees SET phone = '13800000001' WHERE employee_no = 'ADMIN001' AND phone IS NULL;
UPDATE employees SET phone = '13800000002' WHERE employee_no = 'EXAM001' AND phone IS NULL;

-- I26: published exam description revision history (does not overwrite frozen published version)
CREATE TABLE IF NOT EXISTS exam_description_revisions (
    id              VARCHAR(32) PRIMARY KEY,
    exam_id         VARCHAR(32) NOT NULL REFERENCES exams(id),
    body            TEXT,
    actor_employee_id VARCHAR(32),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_description_revisions_exam ON exam_description_revisions (exam_id, created_at DESC);
