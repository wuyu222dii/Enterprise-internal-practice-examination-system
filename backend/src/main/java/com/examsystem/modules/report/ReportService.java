package com.examsystem.modules.report;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.PageDto;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.exam.ExamService;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamResultRepository;
import com.examsystem.modules.report.entity.ExportJob;
import com.examsystem.modules.report.repository.ExportJobRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final AuditService auditService;

    public ReportService(
            ExamAttemptRepository attemptRepository,
            ExamResultRepository resultRepository,
            ExportJobRepository exportJobRepository,
            ExamService examService,
            ExportJobRunner exportJobRunner,
            AuditService auditService
    ) {
        this.attemptRepository = attemptRepository;
        this.resultRepository = resultRepository;
        this.exportJobRepository = exportJobRepository;
        this.examService = examService;
        this.exportJobRunner = exportJobRunner;
        this.auditService = auditService;
    }

    public Map<String, Object> getScoreSummary(String examId) {
        SecurityUtils.requireAdmin();
        List<ExamAttempt> attempts = attemptRepository.findByExamId(examId);
        long completed = attempts.stream().filter(a -> "completed".equals(a.getAttemptStatus())).count();
        return Map.of(
                "examId", examId,
                "assignedCount", attempts.size(),
                "completedCount", completed
        );
    }

    public PageDto<Map<String, Object>> listEmployeeScores(String examId, int page, int pageSize) {
        SecurityUtils.requireAdmin();
        Page<ExamAttempt> result = attemptRepository.findByExamId(examId, PageRequest.of(page - 1, pageSize));
        List<Map<String, Object>> items = result.getContent().stream().map(this::scoreRow).toList();
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
        exportJobRunner.runExport(job.getId());

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
        dto.put("downloadUrl", job.getFileKey());
        dto.put("expiresAt", job.getExpiresAt());
        return dto;
    }

    private Map<String, Object> scoreRow(ExamAttempt attempt) {
        Map<String, Object> row = attemptRow(attempt);
        resultRepository.findByExamAttemptId(attempt.getId()).ifPresent(r -> {
            row.put("totalScore", r.getTotalScore());
            row.put("maxScore", r.getMaxScore());
        });
        return row;
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
