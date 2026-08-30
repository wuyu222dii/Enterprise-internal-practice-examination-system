package com.examsystem.modules.exam.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "exam_attempts")
public class ExamAttempt {
    @Id private String id;
    @Column(name = "exam_id", nullable = false, length = 32) private String examId;
    @Column(name = "employee_id", nullable = false, length = 32) private String employeeId;
    @Column(name = "published_version_id", nullable = false, length = 32) private String publishedVersionId;
    @Column(name = "attempt_number", nullable = false) private int attemptNumber;
    @Column(name = "attempt_status", nullable = false, length = 30) private String attemptStatus = "inProgress";
    @Column(name = "participation_status", length = 30) private String participationStatus;
    @Column(name = "result_status", length = 30) private String resultStatus;
    @Column(name = "attention_flag", nullable = false) private boolean attentionFlag;
    @Column(name = "started_at", nullable = false) private Instant startedAt;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "submit_reason", length = 30) private String submitReason;
    @Column(name = "submitted_at") private Instant submittedAt;
    @Column(name = "compensation_seconds", nullable = false) private int compensationSeconds;
    @Column(nullable = false) private boolean voided;
    @Column(name = "void_reason", columnDefinition = "text") private String voidReason;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getPublishedVersionId() { return publishedVersionId; }
    public void setPublishedVersionId(String publishedVersionId) { this.publishedVersionId = publishedVersionId; }
    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }
    public String getAttemptStatus() { return attemptStatus; }
    public void setAttemptStatus(String attemptStatus) { this.attemptStatus = attemptStatus; }
    public String getParticipationStatus() { return participationStatus; }
    public void setParticipationStatus(String participationStatus) { this.participationStatus = participationStatus; }
    public String getResultStatus() { return resultStatus; }
    public void setResultStatus(String resultStatus) { this.resultStatus = resultStatus; }
    public boolean isAttentionFlag() { return attentionFlag; }
    public void setAttentionFlag(boolean attentionFlag) { this.attentionFlag = attentionFlag; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public String getSubmitReason() { return submitReason; }
    public void setSubmitReason(String submitReason) { this.submitReason = submitReason; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public int getCompensationSeconds() { return compensationSeconds; }
    public void setCompensationSeconds(int compensationSeconds) { this.compensationSeconds = compensationSeconds; }
    public boolean isVoided() { return voided; }
    public void setVoided(boolean voided) { this.voided = voided; }
    public String getVoidReason() { return voidReason; }
    public void setVoidReason(String voidReason) { this.voidReason = voidReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
