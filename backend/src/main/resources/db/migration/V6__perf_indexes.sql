-- Indexes for the query shapes exercised by the capacity and load acceptance scenarios
-- (PERF-01..04, CAP-01). Existing UNIQUE constraints already cover
-- exam_answers(exam_attempt_id, paper_item_id), exam_results(exam_attempt_id),
-- exam_assignments(published_version_id, employee_id) and question_versions(question_id, version_no).

-- Auto-submit scheduler scans for expired attempts on every tick (PERF-03).
CREATE INDEX idx_exam_attempts_status_expires ON exam_attempts (attempt_status, expires_at);
-- Employee record list and remaining-attempt counting.
CREATE INDEX idx_exam_attempts_employee_created ON exam_attempts (employee_id, created_at DESC);
CREATE INDEX idx_exam_attempts_exam_employee ON exam_attempts (exam_id, employee_id);
-- Export orders attempts by employee to build the per-employee rollup.
CREATE INDEX idx_exam_attempts_exam_employee_number ON exam_attempts (exam_id, employee_id, attempt_number);

-- Employee task list resolves assignments by employee.
CREATE INDEX idx_exam_assignments_employee ON exam_assignments (employee_id);

-- Paper generation and publish preflight scan a whole bank.
CREATE INDEX idx_questions_bank ON questions (question_bank_id);
CREATE INDEX idx_categories_bank ON categories (question_bank_id);
CREATE INDEX idx_knowledge_points_category ON knowledge_points (category_id);

CREATE INDEX idx_mock_attempts_status_expires ON mock_attempts (status, expires_at);
CREATE INDEX idx_mock_attempts_employee_status ON mock_attempts (employee_id, status);
CREATE INDEX idx_mock_attempts_employee_created ON mock_attempts (employee_id, created_at DESC);

CREATE INDEX idx_practice_sessions_employee_status ON practice_sessions (employee_id, status);
CREATE INDEX idx_practice_sessions_employee_created ON practice_sessions (employee_id, created_at DESC);

CREATE INDEX idx_wrong_book_employee_updated ON wrong_book_entries (employee_id, updated_at DESC);

CREATE INDEX idx_export_jobs_exam_created ON export_jobs (exam_id, created_at DESC);

-- Department path resolution during employee create and batch import.
CREATE INDEX idx_departments_path ON departments (path);
-- Phone duplicate checks during import and SMS-based password reset.
CREATE INDEX idx_employees_phone ON employees (phone);
-- Employee search orders by employee_no across the whole active population (2,000 assignee expansion).
CREATE INDEX idx_employees_status_no ON employees (status, employee_no);
