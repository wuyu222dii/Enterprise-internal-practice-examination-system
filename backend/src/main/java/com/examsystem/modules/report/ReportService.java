package com.examsystem.modules.report;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.PageDto;
import com.examsystem.common.storage.FileStore;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.exam.ExamService;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.entity.ExamResult;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamResultRepository;
import com.examsystem.modules.report.entity.ExportJob;
import com.examsystem.modules.report.repository.ExportJobRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private final ExamAttemptRepository attemptRepository;
    private final ExamResultRepository resultRepository;
    private final ExportJobRepository exportJobRepository;
    private final ExamService examService;
    private final ExportJobRunner exportJobRunner;
    private final FileStore fileStore;
    private final AuditService auditService;

    public ReportService(
            ExamAttemptRepository attemptRepository,
            ExamResultRepository resultRepository,
            ExportJobRepository exportJobRepository,
            ExamService examService,
            ExportJobRunner exportJobRunner,
            FileStore fileStore,
            AuditService auditService
    ) {
        this.attemptRepository = attemptRepository;
        this.resultRepository = resultRepository;
        this.exportJobRepository = exportJobRepository;
        this.examService = examService;
        this.exportJobRunner = exportJobRunner;
        this.fileStore = fileStore;
        this.auditService = auditService;
    }

    public Map<String, Object> getScoreSummary(String examId) {
        SecurityUtils.requireAdmin();
        return Map.of(
                "examId", examId,
                "assignedCount", attemptRepository.countByExamId(examId),
                "completedCount", attemptRepository.countByExamIdAndAttemptStatus(examId, "completed")
        );
    }

    public PageDto<Map<String, Object>> listEmployeeScores(String examId, int page, int pageSize) {
        SecurityUtils.requireAdmin();
        Page<ExamAttempt> result = attemptRepository.findByExamId(examId, PageRequest.of(page - 1, pageSize));
        Map<String, ExamResult> results = loadResults(result.getContent());
        List<Map<String, Object>> items = result.getContent().stream()
                .map(attempt -> scoreRow(attempt, results.get(attempt.getId())))
                .toList();
        return new PageDto<>(items, result.getTotalElements(), page, pageSize);
    }

    public PageDto<Map<String, Object>> listAttempts(String examId, int page, int pageSize) {
        SecurityUtils.requireAdmin();
        Page<ExamAttempt> result = attemptRepository.findByExamId(examId, PageRequest.of(page - 1, pageSize));
        List<Map<String, Object>> items = result.getContent().stream().map(this::attemptRow).toList();
        return new PageDto<>(items, result.getTotalElements(), page, pageSize);
    }

    public Map<String, Object> getAttemptDetail(String examId, String attemptId) {
        SecurityUtils.requireAdmin();
        ExamAttempt attempt = examService.getAttempt(attemptId);
        if (!examId.equals(attempt.getExamId())) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "尝试不存在", 404);
        }
        return attemptRow(attempt);
    }

    @Transactional
    public void voidAttempt(String examId, String attemptId, String employeeVisibleReason, String internalReason) {
        SecurityUtils.requireAdmin();
        ExamAttempt attempt = examService.getAttempt(attemptId);
        if (!examId.equals(attempt.getExamId())) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "尝试不存在", 404);
        }
        Map<String, Object> before = Map.of("attemptStatus", attempt.getAttemptStatus(), "voided", attempt.isVoided());
        attempt.setVoided(true);
        attempt.setVoidReason(internalReason);
        attempt.setAttemptStatus("voided");
        attemptRepository.save(attempt);
        auditService.log(
                "attempt.void",
                "ExamAttempt",
                attemptId,
                before,
                Map.of("attemptStatus", "voided", "voided", true),
                internalReason
        );
    }

    @Transactional
    public Map<String, Object> createExport(String examId) {
        SecurityUtils.requireAdmin();
        ExportJob job = new ExportJob();
        job.setId(IdGenerator.newId("exp"));
        job.setExamId(examId);
        job.setStatus("pending");
        job.setCreatedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        job.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));
        exportJobRepository.save(job);
        runExportAfterCommit(job.getId());

        Map<String, Object> dto = new HashMap<>();
        dto.put("jobId", job.getId());
        dto.put("status", job.getStatus());
        return dto;
    }

    public Map<String, Object> getExportJob(String jobId) {
        SecurityUtils.requireAdmin();
        ExportJob job = exportJobRepository.findById(jobId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "导出任务不存在", 404));
        Map<String, Object> dto = new HashMap<>();
        dto.put("jobId", job.getId());
        dto.put("status", job.getStatus());
        dto.put("downloadUrl", "/admin/exports/" + job.getId() + "/download");
        dto.put("expiresAt", job.getExpiresAt());
        return dto;
    }

    public Resource downloadExport(String jobId) {
        SecurityUtils.requireAdmin();
        ExportJob job = exportJobRepository.findById(jobId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "导出任务不存在", 404));
        if (!"completed".equals(job.getStatus()) || job.getFileKey() == null) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "导出尚未完成", 422);
        }
        return fileStore.read(job.getFileKey())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "导出文件不存在", 404));
    }

    /**
     * The async worker reads the job by id, so it must not start before the enclosing transaction
     * has made that row visible.
     */
    private void runExportAfterCommit(String jobId) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            exportJobRunner.runExport(jobId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                exportJobRunner.runExport(jobId);
            }
        });
    }

    private Map<String, Object> scoreRow(ExamAttempt attempt, ExamResult result) {
        Map<String, Object> row = attemptRow(attempt);
        if (result != null) {
            row.put("totalScore", result.getTotalScore());
            row.put("maxScore", result.getMaxScore());
        }
        return row;
    }

    private Map<String, ExamResult> loadResults(List<ExamAttempt> attempts) {
        if (attempts.isEmpty()) {
            return Map.of();
        }
        List<String> attemptIds = attempts.stream().map(ExamAttempt::getId).toList();
        Map<String, ExamResult> results = new HashMap<>();
        for (ExamResult result : resultRepository.findByExamAttemptIdIn(attemptIds)) {
            results.put(result.getExamAttemptId(), result);
        }
        return results;
    }

    private Map<String, Object> attemptRow(ExamAttempt attempt) {
        Map<String, Object> row = new HashMap<>();
        row.put("attemptId", attempt.getId());
        row.put("employeeId", attempt.getEmployeeId());
        row.put("attemptNumber", attempt.getAttemptNumber());
        row.put("attemptStatus", attempt.getAttemptStatus());
        row.put("voided", attempt.isVoided());
        row.put("startedAt", attempt.getStartedAt());
        return row;
    }
}
