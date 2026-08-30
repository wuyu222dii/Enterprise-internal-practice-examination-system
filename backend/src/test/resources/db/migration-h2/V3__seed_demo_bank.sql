-- Wizard draft config storage on exams
-- H2 stores a plain string literal in a JSON column as a JSON *string*; FORMAT JSON is required
-- so the value round-trips as an object/array the way JSONB does on PostgreSQL.
ALTER TABLE exams ADD COLUMN wizard_config JSON NOT NULL DEFAULT '{}' FORMAT JSON;

-- Demo question bank with 10 single-choice questions for exam wizard testing
INSERT INTO question_banks (id, name, status, practice_enabled, mock_enabled)
VALUES ('qb_demo', '演示题库', 'active', TRUE, TRUE);

INSERT INTO categories (id, question_bank_id, name)
VALUES ('cat_demo', 'qb_demo', '通用');

INSERT INTO questions (id, question_bank_id, category_id, status) VALUES
('q_demo_01', 'qb_demo', 'cat_demo', 'active'),
('q_demo_02', 'qb_demo', 'cat_demo', 'active'),
('q_demo_03', 'qb_demo', 'cat_demo', 'active'),
('q_demo_04', 'qb_demo', 'cat_demo', 'active'),
('q_demo_05', 'qb_demo', 'cat_demo', 'active'),
('q_demo_06', 'qb_demo', 'cat_demo', 'active'),
('q_demo_07', 'qb_demo', 'cat_demo', 'active'),
('q_demo_08', 'qb_demo', 'cat_demo', 'active'),
('q_demo_09', 'qb_demo', 'cat_demo', 'active'),
('q_demo_10', 'qb_demo', 'cat_demo', 'active');

INSERT INTO question_versions (id, question_id, version_no, type, stem, options_json, standard_answer, explanation, difficulty, default_score, status) VALUES
('qv_demo_01', 'q_demo_01', 1, 'singleChoice', '演示题 1：1+1=?',
 '[{"key":"A","text":"1"},{"key":"B","text":"2"},{"key":"C","text":"3"},{"key":"D","text":"4"}]' FORMAT JSON, '["B"]' FORMAT JSON, '1+1=2', 'easy', 1, 'active'),
('qv_demo_02', 'q_demo_02', 1, 'singleChoice', '演示题 2：2+2=?',
 '[{"key":"A","text":"2"},{"key":"B","text":"3"},{"key":"C","text":"4"},{"key":"D","text":"5"}]' FORMAT JSON, '["C"]' FORMAT JSON, '2+2=4', 'easy', 1, 'active'),
('qv_demo_03', 'q_demo_03', 1, 'singleChoice', '演示题 3：3+3=?',
 '[{"key":"A","text":"5"},{"key":"B","text":"6"},{"key":"C","text":"7"},{"key":"D","text":"8"}]' FORMAT JSON, '["B"]' FORMAT JSON, '3+3=6', 'easy', 1, 'active'),
('qv_demo_04', 'q_demo_04', 1, 'singleChoice', '演示题 4：4+4=?',
 '[{"key":"A","text":"6"},{"key":"B","text":"7"},{"key":"C","text":"8"},{"key":"D","text":"9"}]' FORMAT JSON, '["C"]' FORMAT JSON, '4+4=8', 'easy', 1, 'active'),
('qv_demo_05', 'q_demo_05', 1, 'singleChoice', '演示题 5：5+5=?',
 '[{"key":"A","text":"8"},{"key":"B","text":"9"},{"key":"C","text":"10"},{"key":"D","text":"11"}]' FORMAT JSON, '["C"]' FORMAT JSON, '5+5=10', 'easy', 1, 'active'),
('qv_demo_06', 'q_demo_06', 1, 'singleChoice', '演示题 6：6+6=?',
 '[{"key":"A","text":"10"},{"key":"B","text":"11"},{"key":"C","text":"12"},{"key":"D","text":"13"}]' FORMAT JSON, '["C"]' FORMAT JSON, '6+6=12', 'easy', 1, 'active'),
('qv_demo_07', 'q_demo_07', 1, 'singleChoice', '演示题 7：7+7=?',
 '[{"key":"A","text":"12"},{"key":"B","text":"13"},{"key":"C","text":"14"},{"key":"D","text":"15"}]' FORMAT JSON, '["C"]' FORMAT JSON, '7+7=14', 'easy', 1, 'active'),
('qv_demo_08', 'q_demo_08', 1, 'singleChoice', '演示题 8：8+8=?',
 '[{"key":"A","text":"14"},{"key":"B","text":"15"},{"key":"C","text":"16"},{"key":"D","text":"17"}]' FORMAT JSON, '["C"]' FORMAT JSON, '8+8=16', 'easy', 1, 'active'),
('qv_demo_09', 'q_demo_09', 1, 'singleChoice', '演示题 9：9+9=?',
 '[{"key":"A","text":"16"},{"key":"B","text":"17"},{"key":"C","text":"18"},{"key":"D","text":"19"}]' FORMAT JSON, '["C"]' FORMAT JSON, '9+9=18', 'easy', 1, 'active'),
('qv_demo_10', 'q_demo_10', 1, 'singleChoice', '演示题 10：10+10=?',
 '[{"key":"A","text":"18"},{"key":"B","text":"19"},{"key":"C","text":"20"},{"key":"D","text":"21"}]' FORMAT JSON, '["C"]' FORMAT JSON, '10+10=20', 'easy', 1, 'active');
