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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final int importConfirmDays;
    private final int importFileDays;
    private final int exportHours;
    private final int credentialHours;

    public RetentionService(
            ImportTaskRepository importTaskRepository,
            ExportJobRepository exportJobRepository,
            EmployeeCredentialBatchRepository credentialBatchRepository,
            FileStore fileStore,
            AuditService auditService,
            @Value("${exam.retention.import-confirm-days:30}") int importConfirmDays,
            @Value("${exam.retention.import-file-days:180}") int importFileDays,
            @Value("${exam.retention.export-hours:24}") int exportHours,
            @Value("${exam.retention.credential-hours:24}") int credentialHours
    ) {
        this.importTaskRepository = importTaskRepository;
        this.exportJobRepository = exportJobRepository;
        this.credentialBatchRepository = credentialBatchRepository;
        this.fileStore = fileStore;
        this.auditService = auditService;
        this.importConfirmDays = importConfirmDays;
        this.importFileDays = importFileDays;
        this.exportHours = exportHours;
        this.credentialHours = credentialHours;
    }

    @Transactional
    public void purgeExpired() {
        Instant now = Instant.now();
        expireImportConfirmations(now);
        deleteImportFiles(now);
        deleteExportFiles(now);
        deleteCredentialFiles(now);
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
        // Jobs without expiresAt still age out from createdAt via expiresAt set at completion;
        // also pick up overdue completed jobs whose expiresAt is in the past.
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
