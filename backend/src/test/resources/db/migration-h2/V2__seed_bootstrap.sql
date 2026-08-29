-- Root department and bootstrap admin (password: Admin@123, must change on first login)
INSERT INTO departments (id, name, parent_id, path, status)
VALUES ('dept_root', '总公司', NULL, '/总公司', 'active');

INSERT INTO employees (
    id, employee_no, display_name, department_id, phone, password_hash,
    status, is_admin, has_outage_disposition, must_change_password
) VALUES (
    'emp_admin',
    'ADMIN001',
    '系统管理员',
    'dept_root',
    NULL,
    '$2a$10$EDmuNZQg5Gx2Eur..7aI2e/gMbowNf3EqcpZ8YRYVWSJxOXL0FeXa',
    'active',
    TRUE,
    TRUE,
    TRUE
);
