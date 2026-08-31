-- I21: readable exam codes for employee locate / copy-to-PC
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_code VARCHAR(16);
UPDATE exams SET exam_code = 'EX-DEMO1' WHERE id = 'exm_demo' AND exam_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_exams_exam_code ON exams (exam_code);

-- I23: append-only audit hash chain
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS chain_seq BIGINT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uk_audit_logs_chain_seq ON audit_logs (chain_seq);

-- I24: sequential practice long-term cursor per employee + bank
CREATE TABLE IF NOT EXISTS practice_progress (
    id                  VARCHAR(32) PRIMARY KEY,
    employee_id         VARCHAR(32) NOT NULL REFERENCES employees(id),
    question_bank_id    VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    last_question_id    VARCHAR(32),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, question_bank_id)
);
CREATE INDEX IF NOT EXISTS idx_practice_progress_employee ON practice_progress (employee_id);
