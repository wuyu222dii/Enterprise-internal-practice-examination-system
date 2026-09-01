package com.examsystem;

import com.examsystem.modules.retention.RetentionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RetentionIntegrationTest {

    @Autowired
    private RetentionService retentionService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void practiceOlderThanTwoYearsIsPurgedWhileRecentExamAttemptRemains() {
        String oldSessionId = "ps_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        jdbcTemplate.update(
                """
                        INSERT INTO practice_sessions
                        (id, employee_id, question_bank_id, mode, status, question_count, current_index, created_at)
                        VALUES (?, 'emp_admin', 'qb_demo', 'random', 'completed', 1, 0, ?)
                        """,
                oldSessionId,
                Timestamp.from(Instant.now().minus(800, ChronoUnit.DAYS))
        );
        String recentAttemptId = "att_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        Instant now = Instant.now();
        jdbcTemplate.update(
                """
                        INSERT INTO exam_attempts
                        (id, exam_id, employee_id, published_version_id, attempt_number, attempt_status,
                         attention_flag, started_at, expires_at, voided, created_at, updated_at)
                        VALUES (?, 'exm_demo', 'emp_exam', 'epv_demo', 9, 'completed', FALSE, ?, ?, FALSE, ?, ?)
                        """,
                recentAttemptId,
                Timestamp.from(now.minus(10, ChronoUnit.DAYS)),
                Timestamp.from(now.minus(10, ChronoUnit.DAYS).plus(1, ChronoUnit.HOURS)),
                Timestamp.from(now.minus(10, ChronoUnit.DAYS)),
                Timestamp.from(now.minus(10, ChronoUnit.DAYS))
        );

        retentionService.purgeExpired();

        Integer sessions = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM practice_sessions WHERE id = ?", Integer.class, oldSessionId);
        Integer attempts = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM exam_attempts WHERE id = ?", Integer.class, recentAttemptId);
        assertThat(sessions).isZero();
        assertThat(attempts).isEqualTo(1);

        jdbcTemplate.update("DELETE FROM exam_attempts WHERE id = ?", recentAttemptId);
    }
}
