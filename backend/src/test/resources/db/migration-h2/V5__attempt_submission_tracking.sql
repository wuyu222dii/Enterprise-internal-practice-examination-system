ALTER TABLE exam_attempts ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE exam_attempts ADD COLUMN compensation_seconds INT NOT NULL DEFAULT 0;
