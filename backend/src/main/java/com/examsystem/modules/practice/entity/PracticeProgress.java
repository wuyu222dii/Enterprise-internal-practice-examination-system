package com.examsystem.modules.practice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
        name = "practice_progress",
        uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "question_bank_id"})
)
public class PracticeProgress {
    @Id
    private String id;
    @Column(name = "employee_id", nullable = false, length = 32)
    private String employeeId;
    @Column(name = "question_bank_id", nullable = false, length = 32)
    private String questionBankId;
    @Column(name = "last_question_id", length = 32)
    private String lastQuestionId;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getQuestionBankId() { return questionBankId; }
    public void setQuestionBankId(String questionBankId) { this.questionBankId = questionBankId; }
    public String getLastQuestionId() { return lastQuestionId; }
    public void setLastQuestionId(String lastQuestionId) { this.lastQuestionId = lastQuestionId; }
    public Instant getUpdatedAt() { return updatedAt; }
}
