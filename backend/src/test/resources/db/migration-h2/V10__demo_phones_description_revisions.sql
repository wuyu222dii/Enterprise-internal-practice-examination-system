UPDATE employees SET phone = '13800000001' WHERE employee_no = 'ADMIN001' AND phone IS NULL;
UPDATE employees SET phone = '13800000002' WHERE employee_no = 'EXAM001' AND phone IS NULL;

CREATE TABLE exam_description_revisions (
    id              VARCHAR(32) PRIMARY KEY,
    exam_id         VARCHAR(32) NOT NULL REFERENCES exams(id),
    body            TEXT,
    actor_employee_id VARCHAR(32),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exam_description_revisions_exam ON exam_description_revisions (exam_id, created_at);
