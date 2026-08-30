CREATE INDEX idx_exam_attempts_status_expires ON exam_attempts (attempt_status, expires_at);
CREATE INDEX idx_exam_attempts_employee_created ON exam_attempts (employee_id, created_at DESC);
CREATE INDEX idx_exam_attempts_exam_employee ON exam_attempts (exam_id, employee_id);
CREATE INDEX idx_exam_attempts_exam_employee_number ON exam_attempts (exam_id, employee_id, attempt_number);

CREATE INDEX idx_exam_assignments_employee ON exam_assignments (employee_id);

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

CREATE INDEX idx_departments_path ON departments (path);
CREATE INDEX idx_employees_phone ON employees (phone);
CREATE INDEX idx_employees_status_no ON employees (status, employee_no);
