package com.examsystem.modules.mock.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "mock_attempts")
public class MockAttempt {
    @Id private String id;
    @Column(name = "employee_id", nullable = false, length = 32) private String employeeId;
    @Column(name = "question_bank_id", nullable = false, length = 32) private String questionBankId;
    @Column(nullable = false, length = 30) private String status = "in_progress";
    @Column(name = "question_count", nullable = false) private int questionCount;
    @Column(name = "duration_minutes", nullable = false) private int durationMinutes;
    @Column(name = "started_at", nullable = false) private Instant startedAt;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "terminated_at") private Instant terminatedAt;
    @Column(name = "terminate_reason", length = 30) private String terminateReason;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getQuestionBankId() { return questionBankId; }
    public void setQuestionBankId(String questionBankId) { this.questionBankId = questionBankId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getTerminatedAt() { return terminatedAt; }
    public void setTerminatedAt(Instant terminatedAt) { this.terminatedAt = terminatedAt; }
    public String getTerminateReason() { return terminateReason; }
    public void setTerminateReason(String terminateReason) { this.terminateReason = terminateReason; }
    public Instant getCreatedAt() { return createdAt; }
}
