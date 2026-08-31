package com.examsystem.modules.exam.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "exam_description_revisions")
public class ExamDescriptionRevision {
    @Id
    private String id;
    @Column(name = "exam_id", nullable = false, length = 32)
    private String examId;
    @Column(columnDefinition = "text")
    private String body;
    @Column(name = "actor_employee_id", length = 32)
    private String actorEmployeeId;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getActorEmployeeId() { return actorEmployeeId; }
    public void setActorEmployeeId(String actorEmployeeId) { this.actorEmployeeId = actorEmployeeId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
