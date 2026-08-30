-- Submission time and platform-outage compensation are required columns of the
-- dual-worksheet score export (requirement 16.4) but were never persisted.
ALTER TABLE exam_attempts ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE exam_attempts ADD COLUMN compensation_seconds INT NOT NULL DEFAULT 0;
