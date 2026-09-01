package com.examsystem.modules.retention;

import com.examsystem.common.storage.FileStore;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.importjob.entity.ImportTask;
import com.examsystem.modules.importjob.repository.ImportTaskRepository;
import com.examsystem.modules.organization.entity.EmployeeCredentialBatch;
import com.examsystem.modules.organization.repository.EmployeeCredentialBatchRepository;
import com.examsystem.modules.report.entity.ExportJob;
import com.examsystem.modules.report.repository.ExportJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class RetentionService {

    private static final Logger log = LoggerFactory.getLogger(RetentionService.class);

    private final ImportTaskRepository importTaskRepository;
    private final ExportJobRepository exportJobRepository;
    private final EmployeeCredentialBatchRepository credentialBatchRepository;
    private final FileStore fileStore;
    private final AuditService auditService;
    private final JdbcTemplate jdbcTemplate;
    private final int importConfirmDays;
    private final int importFileDays;
    private final int exportHours;
    private final int credentialHours;
    private final int examRecordDays;
    private final int practiceRecordDays;
    private final int auditRecordDays;

    public RetentionService(
            ImportTaskRepository importTaskRepository,
            ExportJobRepository exportJobRepository,
            EmployeeCredentialBatchRepository credentialBatchRepository,
            FileStore fileStore,
            AuditService auditService,
            JdbcTemplate jdbcTemplate,
            @Value("${exam.retention.import-confirm-days:30}") int importConfirmDays,
            @Value("${exam.retention.import-file-days:180}") int importFileDays,
            @Value("${exam.retention.export-hours:24}") int exportHours,
            @Value("${exam.retention.credential-hours:24}") int credentialHours,
            @Value("${exam.retention.exam-record-days:1825}") int examRecordDays,
            @Value("${exam.retention.practice-record-days:730}") int practiceRecordDays,
            @Value("${exam.retention.audit-record-days:1825}") int auditRecordDays
    ) {
        this.importTaskRepository = importTaskRepository;
        this.exportJobRepository = exportJobRepository;
        this.credentialBatchRepository = credentialBatchRepository;
        this.fileStore = fileStore;
        this.auditService = auditService;
        this.jdbcTemplate = jdbcTemplate;
        this.importConfirmDays = importConfirmDays;
        this.importFileDays = importFileDays;
        this.exportHours = exportHours;
        this.credentialHours = credentialHours;
        this.examRecordDays = examRecordDays;
        this.practiceRecordDays = practiceRecordDays;
        this.auditRecordDays = auditRecordDays;
    }

    @Transactional
    public void purgeExpired() {
        Instant now = Instant.now();
        expireImportConfirmations(now);
        deleteImportFiles(now);
        deleteExportFiles(now);
        deleteCredentialFiles(now);
        purgeExamRecords(now);
        purgePracticeAndMockRecords(now);
        purgeAuditLogs(now);
    }

    private void expireImportConfirmations(Instant now) {
        Instant cutoff = now.minus(importConfirmDays, ChronoUnit.DAYS);
        List<ImportTask> stale = importTaskRepository.findByStatusInAndCreatedAtBefore(
                List.of("preview_ready", "needs_revalidation"), cutoff);
        for (ImportTask task : stale) {
            String previous = task.getStatus();
            task.setStatus("expired");
            task.setConfirmToken(null);
            importTaskRepository.save(task);
            auditService.log(
                    "retention.import.expire",
                    "ImportTask",
                    task.getId(),
                    Map.of("status", previous),
                    Map.of("status", "expired"),
                    "IMP-09 超过 " + importConfirmDays + " 天未确认"
            );
        }
        if (!stale.isEmpty()) {
            log.info("Expired {} import tasks older than {} days", stale.size(), importConfirmDays);
        }
    }

    private void deleteImportFiles(Instant now) {
        Instant cutoff = now.minus(importFileDays, ChronoUnit.DAYS);
        List<ImportTask> tasks = importTaskRepository.findByFileKeyIsNotNullAndCreatedAtBefore(cutoff);
        int deleted = 0;
        for (ImportTask task : tasks) {
            deleteQuietly(task.getFileKey());
            task.setFileKey(null);
            importTaskRepository.save(task);
            deleted++;
        }
        if (deleted > 0) {
            auditService.log(
                    "retention.import.file",
                    "ImportTask",
                    null,
                    null,
                    Map.of("deletedFiles", deleted),
                    "RET-01 导入文件超过 " + importFileDays + " 天"
            );
            log.info("Cleared {} import file objects older than {} days", deleted, importFileDays);
        }
    }

    private void deleteExportFiles(Instant now) {
        Instant cutoff = now.minus(exportHours, ChronoUnit.HOURS);
        List<ExportJob> jobs = exportJobRepository.findByFileKeyIsNotNullAndExpiresAtBefore(cutoff);
        int deleted = 0;
        for (ExportJob job : jobs) {
            deleteQuietly(job.getFileKey());
            job.setFileKey(null);
            if ("completed".equals(job.getStatus())) {
                job.setStatus("expired");
            }
            exportJobRepository.save(job);
            deleted++;
        }
        if (deleted > 0) {
            auditService.log(
                    "retention.export.file",
                    "ExportJob",
                    null,
                    null,
                    Map.of("deletedFiles", deleted),
                    "RET-01 导出文件超过 " + exportHours + " 小时"
            );
            log.info("Cleared {} export file objects", deleted);
        }
    }

    private void deleteCredentialFiles(Instant now) {
        Instant cutoff = now.minus(credentialHours, ChronoUnit.HOURS);
        List<EmployeeCredentialBatch> batches = credentialBatchRepository.findByFileKeyIsNotNull();
        int deleted = 0;
        for (EmployeeCredentialBatch batch : batches) {
            boolean expired = batch.getExpiresAt() != null && batch.getExpiresAt().isBefore(now);
            boolean downloaded = batch.getDownloadedAt() != null;
            boolean aged = batch.getCreatedAt() != null && batch.getCreatedAt().isBefore(cutoff);
            if (!expired && !downloaded && !aged) {
                continue;
            }
            deleteQuietly(batch.getFileKey());
            batch.setFileKey(null);
            credentialBatchRepository.save(batch);
            deleted++;
        }
        if (deleted > 0) {
            auditService.log(
                    "retention.credential.file",
                    "EmployeeCredentialBatch",
                    null,
                    null,
                    Map.of("deletedFiles", deleted),
                    "ACC-02 凭据文件到期或已下载后清理；不进入备份目录"
            );
            log.info("Cleared {} credential file objects", deleted);
        }
    }

    private void purgeExamRecords(Instant now) {
        Timestamp cutoff = Timestamp.from(now.minus(examRecordDays, ChronoUnit.DAYS));
        int answers = jdbcTemplate.update(
                "DELETE FROM exam_answers WHERE exam_attempt_id IN (SELECT id FROM exam_attempts WHERE created_at < ?)",
                cutoff);
        int results = jdbcTemplate.update(
                "DELETE FROM exam_results WHERE exam_attempt_id IN (SELECT id FROM exam_attempts WHERE created_at < ?)",
                cutoff);
        int items = jdbcTemplate.update(
                "DELETE FROM exam_paper_items WHERE exam_attempt_id IN (SELECT id FROM exam_attempts WHERE created_at < ?)",
                cutoff);
        int attempts = jdbcTemplate.update("DELETE FROM exam_attempts WHERE created_at < ?", cutoff);
        int deleted = answers + results + items + attempts;
        if (deleted > 0) {
            auditService.log(
                    "retention.exam.records",
                    "ExamAttempt",
                    null,
                    null,
                    Map.of("attempts", attempts, "answers", answers, "results", results, "paperItems", items),
                    "RET-01 考试作答超过 " + examRecordDays + " 天"
            );
            log.info("Purged exam records older than {} days (attempts={})", examRecordDays, attempts);
        }
    }

    private void purgePracticeAndMockRecords(Instant now) {
        Timestamp cutoff = Timestamp.from(now.minus(practiceRecordDays, ChronoUnit.DAYS));
        int practiceAnswers = jdbcTemplate.update(
                "DELETE FROM practice_answers WHERE practice_session_id IN (SELECT id FROM practice_sessions WHERE created_at < ?)",
                cutoff);
        int practiceItems = jdbcTemplate.update(
                "DELETE FROM practice_session_items WHERE practice_session_id IN (SELECT id FROM practice_sessions WHERE created_at < ?)",
                cutoff);
        int practiceSessions = jdbcTemplate.update("DELETE FROM practice_sessions WHERE created_at < ?", cutoff);
        int practiceProgress = jdbcTemplate.update("DELETE FROM practice_progress WHERE updated_at < ?", cutoff);
        int wrongBook = jdbcTemplate.update("DELETE FROM wrong_book_entries WHERE updated_at < ?", cutoff);
        int mockAnswers = jdbcTemplate.update(
                "DELETE FROM mock_answers WHERE mock_attempt_id IN (SELECT id FROM mock_attempts WHERE created_at < ?)",
                cutoff);
        int mockResults = jdbcTemplate.update(
                "DELETE FROM mock_results WHERE mock_attempt_id IN (SELECT id FROM mock_attempts WHERE created_at < ?)",
                cutoff);
        int mockItems = jdbcTemplate.update(
                "DELETE FROM mock_paper_items WHERE mock_attempt_id IN (SELECT id FROM mock_attempts WHERE created_at < ?)",
                cutoff);
        int mockAttempts = jdbcTemplate.update("DELETE FROM mock_attempts WHERE created_at < ?", cutoff);
        int deleted = practiceAnswers + practiceItems + practiceSessions + practiceProgress + wrongBook
                + mockAnswers + mockResults + mockItems + mockAttempts;
        if (deleted > 0) {
            auditService.log(
                    "retention.practice.records",
                    "PracticeSession",
                    null,
                    null,
                    Map.of(
                            "practiceSessions", practiceSessions,
                            "mockAttempts", mockAttempts,
                            "wrongBook", wrongBook
                    ),
                    "RET-01 练习/模拟超过 " + practiceRecordDays + " 天"
            );
            log.info("Purged practice/mock records older than {} days (sessions={}, mocks={})",
                    practiceRecordDays, practiceSessions, mockAttempts);
        }
    }

    private void purgeAuditLogs(Instant now) {
        Timestamp cutoff = Timestamp.from(now.minus(auditRecordDays, ChronoUnit.DAYS));
        int deleted = jdbcTemplate.update("DELETE FROM audit_logs WHERE occurred_at < ?", cutoff);
        if (deleted > 0) {
            log.info("Purged {} audit log rows older than {} days (hash chain truncated)", deleted, auditRecordDays);
        }
    }

    private void deleteQuietly(String fileKey) {
        if (fileKey == null || fileKey.isBlank()) {
            return;
        }
        try {
            fileStore.delete(fileKey);
        } catch (RuntimeException e) {
            log.warn("Failed to delete stored object {}", fileKey, e);
        }
    }
}
