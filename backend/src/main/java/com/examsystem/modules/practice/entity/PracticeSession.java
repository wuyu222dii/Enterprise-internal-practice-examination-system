package com.examsystem.modules.practice.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "practice_sessions")
public class PracticeSession {
    @Id private String id;
    @Column(name = "employee_id", nullable = false, length = 32) private String employeeId;
    @Column(name = "question_bank_id", nullable = false, length = 32) private String questionBankId;
    @Column(nullable = false, length = 20) private String mode;
    @Column(nullable = false, length = 20) private String status = "in_progress";
    @Column(name = "question_count", nullable = false) private int questionCount;
    @Column(name = "current_index", nullable = false) private int currentIndex;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "finished_at") private Instant finishedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getQuestionBankId() { return questionBankId; }
    public void setQuestionBankId(String questionBankId) { this.questionBankId = questionBankId; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }
    public int getCurrentIndex() { return currentIndex; }
    public void setCurrentIndex(int currentIndex) { this.currentIndex = currentIndex; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant finishedAt) { this.finishedAt = finishedAt; }
}
