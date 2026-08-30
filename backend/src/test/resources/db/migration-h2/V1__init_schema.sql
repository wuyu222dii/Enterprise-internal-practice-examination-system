-- MVP schema aligned with docs/05-数据库设计/00-概念模型与表结构.md

CREATE TABLE departments (
    id              VARCHAR(32) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    parent_id       VARCHAR(32) REFERENCES departments(id),
    path            VARCHAR(500) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (parent_id, name)
);

CREATE TABLE employees (
    id                      VARCHAR(32) PRIMARY KEY,
    employee_no             VARCHAR(50) NOT NULL UNIQUE,
    display_name            VARCHAR(100) NOT NULL,
    department_id           VARCHAR(32) NOT NULL REFERENCES departments(id),
    phone                     VARCHAR(20),
    password_hash           VARCHAR(255) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    is_admin                BOOLEAN NOT NULL DEFAULT FALSE,
    has_outage_disposition  BOOLEAN NOT NULL DEFAULT FALSE,
    must_change_password    BOOLEAN NOT NULL DEFAULT TRUE,
    mini_program_open_id    VARCHAR(64) UNIQUE,
    failed_login_count    INT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_credential_batches (
    id              VARCHAR(32) PRIMARY KEY,
    created_by      VARCHAR(32) NOT NULL REFERENCES employees(id),
    downloaded_at   TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    file_key        VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE question_banks (
    id                  VARCHAR(32) PRIMARY KEY,
    name                VARCHAR(200) NOT NULL UNIQUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    practice_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    mock_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id              VARCHAR(32) PRIMARY KEY,
    question_bank_id VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (question_bank_id, name)
);

CREATE TABLE knowledge_points (
    id              VARCHAR(32) PRIMARY KEY,
    category_id     VARCHAR(32) NOT NULL REFERENCES categories(id),
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (category_id, name)
);

CREATE TABLE questions (
    id              VARCHAR(32) PRIMARY KEY,
    question_bank_id VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    category_id     VARCHAR(32) NOT NULL REFERENCES categories(id),
    knowledge_point_id VARCHAR(32) REFERENCES knowledge_points(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE question_versions (
    id              VARCHAR(32) PRIMARY KEY,
    question_id     VARCHAR(32) NOT NULL REFERENCES questions(id),
    version_no      INT NOT NULL,
    type            VARCHAR(20) NOT NULL,
    stem            TEXT NOT NULL,
    options_json    JSON NOT NULL,
    standard_answer JSON NOT NULL,
    explanation     TEXT,
    difficulty      VARCHAR(20) NOT NULL DEFAULT 'medium',
    default_score   DECIMAL(10,2) NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (question_id, version_no)
);

CREATE TABLE import_tasks (
    id              VARCHAR(32) PRIMARY KEY,
    question_bank_id VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    status          VARCHAR(30) NOT NULL,
    file_key        VARCHAR(500),
    confirm_token   VARCHAR(64),
    importable_count INT NOT NULL DEFAULT 0,
    error_count     INT NOT NULL DEFAULT 0,
    preview_json    JSON,
    created_by      VARCHAR(32) NOT NULL REFERENCES employees(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE practice_sessions (
    id              VARCHAR(32) PRIMARY KEY,
    employee_id     VARCHAR(32) NOT NULL REFERENCES employees(id),
    question_bank_id VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    mode            VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    question_count  INT NOT NULL,
    current_index   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMP
);

CREATE TABLE practice_session_items (
    id                  VARCHAR(32) PRIMARY KEY,
    practice_session_id VARCHAR(32) NOT NULL REFERENCES practice_sessions(id),
    item_order          INT NOT NULL,
    question_version_id VARCHAR(32) NOT NULL REFERENCES question_versions(id),
    UNIQUE (practice_session_id, item_order)
);

CREATE TABLE practice_answers (
    id                  VARCHAR(32) PRIMARY KEY,
    practice_session_id VARCHAR(32) NOT NULL REFERENCES practice_sessions(id),
    question_version_id VARCHAR(32) NOT NULL REFERENCES question_versions(id),
    answer_json         JSON NOT NULL,
    is_correct          BOOLEAN NOT NULL,
    answered_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (practice_session_id, question_version_id)
);

CREATE TABLE wrong_book_entries (
    id                  VARCHAR(32) PRIMARY KEY,
    employee_id         VARCHAR(32) NOT NULL REFERENCES employees(id),
    question_version_id VARCHAR(32) NOT NULL REFERENCES question_versions(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, question_version_id)
);

CREATE TABLE mock_attempts (
    id              VARCHAR(32) PRIMARY KEY,
    employee_id     VARCHAR(32) NOT NULL REFERENCES employees(id),
    question_bank_id VARCHAR(32) NOT NULL REFERENCES question_banks(id),
    status          VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    question_count  INT NOT NULL,
    duration_minutes INT NOT NULL,
    started_at      TIMESTAMP NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    terminated_at   TIMESTAMP,
    terminate_reason VARCHAR(30),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE mock_paper_items (
    id                  VARCHAR(32) PRIMARY KEY,
    mock_attempt_id     VARCHAR(32) NOT NULL REFERENCES mock_attempts(id),
    item_order          INT NOT NULL,
    question_version_id VARCHAR(32) NOT NULL REFERENCES question_versions(id),
    score               DECIMAL(10,2) NOT NULL,
    UNIQUE (mock_attempt_id, item_order)
);

CREATE TABLE mock_answers (
    id                  VARCHAR(32) PRIMARY KEY,
    mock_attempt_id     VARCHAR(32) NOT NULL REFERENCES mock_attempts(id),
    paper_item_id       VARCHAR(32) NOT NULL REFERENCES mock_paper_items(id),
    answer_json         JSON,
    answer_version      INT NOT NULL DEFAULT 0,
    save_status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    confirmed_at        TIMESTAMP,
    UNIQUE (mock_attempt_id, paper_item_id)
);

CREATE TABLE mock_results (
    id              VARCHAR(32) PRIMARY KEY,
    mock_attempt_id VARCHAR(32) NOT NULL UNIQUE REFERENCES mock_attempts(id),
    total_score     DECIMAL(10,2) NOT NULL,
    max_score       DECIMAL(10,2) NOT NULL,
    detail_json     JSON NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE exams (
    id              VARCHAR(32) PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    lifecycle       VARCHAR(30) NOT NULL DEFAULT 'draft',
    run_status      VARCHAR(20) NOT NULL DEFAULT 'normal',
    open_start_at   TIMESTAMP,
    stop_attempt_at TIMESTAMP,
    published_version_id VARCHAR(32),
    result_locked   BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      VARCHAR(32) NOT NULL REFERENCES employees(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE exam_published_versions (
    id              VARCHAR(32) PRIMARY KEY,
    exam_id         VARCHAR(32) NOT NULL REFERENCES exams(id),
    version_no      INT NOT NULL,
    config_json     JSON NOT NULL,
    published_at    TIMESTAMP NOT NULL,
    UNIQUE (exam_id, version_no)
);

CREATE TABLE exam_rule_lines (
    id                      VARCHAR(32) PRIMARY KEY,
    published_version_id    VARCHAR(32) NOT NULL REFERENCES exam_published_versions(id),
    line_order              INT NOT NULL,
    filter_json             JSON NOT NULL,
    draw_count              INT NOT NULL,
    score_per_question      DECIMAL(10,2) NOT NULL
);

CREATE TABLE exam_assignments (
    id                      VARCHAR(32) PRIMARY KEY,
    published_version_id    VARCHAR(32) NOT NULL REFERENCES exam_published_versions(id),
    employee_id             VARCHAR(32) NOT NULL REFERENCES employees(id),
    employee_no_snapshot    VARCHAR(50) NOT NULL,
    display_name_snapshot   VARCHAR(100) NOT NULL,
    department_path_snapshot VARCHAR(500) NOT NULL,
    UNIQUE (published_version_id, employee_id)
);

CREATE TABLE exam_attempts (
    id              VARCHAR(32) PRIMARY KEY,
    exam_id         VARCHAR(32) NOT NULL REFERENCES exams(id),
    employee_id     VARCHAR(32) NOT NULL REFERENCES employees(id),
    published_version_id VARCHAR(32) NOT NULL REFERENCES exam_published_versions(id),
    attempt_number  INT NOT NULL,
    attempt_status  VARCHAR(30) NOT NULL DEFAULT 'inProgress',
    participation_status VARCHAR(30),
    result_status   VARCHAR(30),
    attention_flag  BOOLEAN NOT NULL DEFAULT FALSE,
    started_at      TIMESTAMP NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    submit_reason   VARCHAR(30),
    voided          BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);


CREATE TABLE exam_paper_items (
    id                  VARCHAR(32) PRIMARY KEY,
    exam_attempt_id     VARCHAR(32) NOT NULL REFERENCES exam_attempts(id),
    item_order          INT NOT NULL,
    question_version_id VARCHAR(32) NOT NULL REFERENCES question_versions(id),
    score               DECIMAL(10,2) NOT NULL,
    UNIQUE (exam_attempt_id, item_order)
);

CREATE TABLE exam_answers (
    id              VARCHAR(32) PRIMARY KEY,
    exam_attempt_id VARCHAR(32) NOT NULL REFERENCES exam_attempts(id),
    paper_item_id   VARCHAR(32) NOT NULL REFERENCES exam_paper_items(id),
    answer_json     JSON,
    answer_version  INT NOT NULL DEFAULT 0,
    save_status     VARCHAR(20) NOT NULL DEFAULT 'pending',
    confirmed_at    TIMESTAMP,
    UNIQUE (exam_attempt_id, paper_item_id)
);

CREATE TABLE exam_results (
    id              VARCHAR(32) PRIMARY KEY,
    exam_attempt_id VARCHAR(32) NOT NULL UNIQUE REFERENCES exam_attempts(id),
    total_score     DECIMAL(10,2) NOT NULL,
    max_score       DECIMAL(10,2) NOT NULL,
    passed          BOOLEAN,
    detail_json     JSON NOT NULL,
    official_valid  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE export_jobs (
    id              VARCHAR(32) PRIMARY KEY,
    exam_id         VARCHAR(32) NOT NULL REFERENCES exams(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    file_key        VARCHAR(500),
    expires_at      TIMESTAMP,
    created_by      VARCHAR(32) NOT NULL REFERENCES employees(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE outage_events (
    id              VARCHAR(32) PRIMARY KEY,
    status          VARCHAR(30) NOT NULL,
    candidate_started_at TIMESTAMP,
    open_interval_end TIMESTAMP,
    affected_exam_ids JSON NOT NULL DEFAULT '[]' FORMAT JSON,
    latest_proposal_version INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE outage_proposals (
    id              VARCHAR(32) PRIMARY KEY,
    outage_event_id VARCHAR(32) NOT NULL REFERENCES outage_events(id),
    version         INT NOT NULL,
    proposal_json   JSON NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    decided_by      VARCHAR(32) REFERENCES employees(id),
    decided_at      TIMESTAMP,
    UNIQUE (outage_event_id, version)
);

CREATE TABLE audit_logs (
    id              VARCHAR(32) PRIMARY KEY,
    occurred_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    actor_employee_id VARCHAR(32) REFERENCES employees(id),
    action_type     VARCHAR(100) NOT NULL,
    target_type     VARCHAR(100),
    target_id       VARCHAR(32),
    before_json     JSON,
    after_json      JSON,
    reason          TEXT,
    request_id      VARCHAR(64),
    client_ip       VARCHAR(45)
);

CREATE TABLE idempotency_records (
    id              VARCHAR(32) PRIMARY KEY,
    idempotency_key VARCHAR(64) NOT NULL,
    scope           VARCHAR(200) NOT NULL,
    response_json   JSON NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key, scope)
);

CREATE TABLE sms_verifications (
    id              VARCHAR(32) PRIMARY KEY,
    phone           VARCHAR(20) NOT NULL,
    purpose         VARCHAR(30) NOT NULL,
    code_hash       VARCHAR(255) NOT NULL,
    verification_token VARCHAR(64),
    expires_at      TIMESTAMP NOT NULL,
    used_at         TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_occurred ON audit_logs (occurred_at DESC);
CREATE INDEX idx_exam_attempts_exam ON exam_attempts (exam_id);
CREATE INDEX idx_employees_department ON employees (department_id);
