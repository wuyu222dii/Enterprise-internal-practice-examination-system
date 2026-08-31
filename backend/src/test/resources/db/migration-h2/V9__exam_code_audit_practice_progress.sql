ALTER TABLE exams ADD COLUMN exam_code VARCHAR(16);
UPDATE exams SET exam_code = 'EX-DEMO1' WHERE id = 'exm_demo' AND exam_code IS NULL;
CREATE UNIQUE INDEX uk_exams_exam_code ON exams (exam_code);

ALTER TABLE audit_logs ADD COLUMN chain_seq BIGINT;
ALTER TABLE audit_logs ADD COLUMN content_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN prev_hash VARCHAR(64);
CREATE UNIQUE INDEX uk_audit_logs_chain_seq ON audit_logs (chain_seq);

CREATE TABLE practice_progress (
    id                  VARCHAR(32) PRIMARY KEY,
    employee_id         VARCHAR(32) NOT NULL REFERENCES employees(id),
    question_bank_id    VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    last_question_id    VARCHAR(32),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, question_bank_id)
);
CREATE INDEX idx_practice_progress_employee ON practice_progress (employee_id);
