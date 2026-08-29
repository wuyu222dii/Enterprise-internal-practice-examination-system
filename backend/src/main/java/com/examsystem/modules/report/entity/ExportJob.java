package com.examsystem.modules.report.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "export_jobs")
public class ExportJob {
    @Id private String id;
    @Column(name = "exam_id", nullable = false, length = 32) private String examId;
    @Column(nullable = false, length = 20) private String status = "pending";
    @Column(name = "file_key", length = 500) private String fileKey;
    @Column(name = "expires_at") private Instant expiresAt;
    @Column(name = "created_by", nullable = false, length = 32) private String createdBy;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getFileKey() { return fileKey; }
    public void setFileKey(String fileKey) { this.fileKey = fileKey; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
