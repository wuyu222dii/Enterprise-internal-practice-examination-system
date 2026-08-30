-- Demo published exam assigned to bootstrap admin for integration testing
INSERT INTO employees (
    id, employee_no, display_name, department_id, phone, password_hash,
    status, is_admin, has_outage_disposition, must_change_password
) VALUES (
    'emp_exam',
    'EXAM001',
    '考试测试员',
    'dept_root',
    NULL,
    '$2a$10$EDmuNZQg5Gx2Eur..7aI2e/gMbowNf3EqcpZ8YRYVWSJxOXL0FeXa',
    'active',
    FALSE,
    FALSE,
    FALSE
);

INSERT INTO exams (
    id, title, description, lifecycle, run_status, open_start_at,
    published_version_id, result_locked, created_by, wizard_config
) VALUES (
    'exm_demo', '演示考试', '集成测试用演示考试', 'openForAttempt', 'normal', CURRENT_TIMESTAMP,
    'epv_demo', FALSE, 'emp_admin', '{}'
);

INSERT INTO exam_published_versions (id, exam_id, version_no, config_json, published_at)
VALUES (
    'epv_demo', 'exm_demo', 1,
    '{"durationMinutes":60,"maxAttempts":3,"passingScore":0}',
    CURRENT_TIMESTAMP
);

INSERT INTO exam_rule_lines (id, published_version_id, line_order, filter_json, draw_count, score_per_question)
VALUES (
    'erl_demo', 'epv_demo', 1,
    '{"bankId":"qb_demo","type":"singleChoice"}',
    2, 1
);

INSERT INTO exam_assignments (
    id, published_version_id, employee_id,
    employee_no_snapshot, display_name_snapshot, department_path_snapshot
) VALUES (
    'eas_demo', 'epv_demo', 'emp_exam',
    'EXAM001', '考试测试员', '/总公司'
);
