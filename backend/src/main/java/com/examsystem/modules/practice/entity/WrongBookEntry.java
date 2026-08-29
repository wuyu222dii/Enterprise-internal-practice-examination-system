package com.examsystem.modules.practice.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "wrong_book_entries")
public class WrongBookEntry {
    @Id private String id;
    @Column(name = "employee_id", nullable = false, length = 32) private String employeeId;
    @Column(name = "question_version_id", nullable = false, length = 32) private String questionVersionId;
    @Column(nullable = false, length = 20) private String status = "pending";
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getQuestionVersionId() { return questionVersionId; }
    public void setQuestionVersionId(String questionVersionId) { this.questionVersionId = questionVersionId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getUpdatedAt() { return updatedAt; }
}
