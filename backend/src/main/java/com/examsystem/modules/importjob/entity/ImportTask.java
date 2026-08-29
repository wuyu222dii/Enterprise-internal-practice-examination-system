package com.examsystem.modules.importjob.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "import_tasks")
public class ImportTask {
    @Id private String id;
    @Column(name = "question_bank_id", nullable = false, length = 32) private String questionBankId;
    @Column(nullable = false, length = 30) private String status;
    @Column(name = "file_key", length = 500) private String fileKey;
    @Column(name = "confirm_token", length = 64) private String confirmToken;
    @Column(name = "importable_count", nullable = false) private int importableCount;
    @Column(name = "error_count", nullable = false) private int errorCount;
    @JsonColumn @Column(name = "preview_json") private String previewJson;
    @Column(name = "created_by", nullable = false, length = 32) private String createdBy;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getQuestionBankId() { return questionBankId; }
    public void setQuestionBankId(String questionBankId) { this.questionBankId = questionBankId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFileKey() { return fileKey; }
    public void setFileKey(String fileKey) { this.fileKey = fileKey; }
    public String getConfirmToken() { return confirmToken; }
    public void setConfirmToken(String confirmToken) { this.confirmToken = confirmToken; }
    public int getImportableCount() { return importableCount; }
    public void setImportableCount(int importableCount) { this.importableCount = importableCount; }
    public int getErrorCount() { return errorCount; }
    public void setErrorCount(int errorCount) { this.errorCount = errorCount; }
    public String getPreviewJson() { return previewJson; }
    public void setPreviewJson(String previewJson) { this.previewJson = previewJson; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
