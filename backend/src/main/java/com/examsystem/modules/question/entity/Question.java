package com.examsystem.modules.question.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "questions")
public class Question {
    @Id private String id;
    @Column(name = "question_bank_id", nullable = false, length = 32) private String questionBankId;
    @Column(name = "category_id", nullable = false, length = 32) private String categoryId;
    @Column(name = "knowledge_point_id", length = 32) private String knowledgePointId;
    @Column(nullable = false, length = 20) private String status = "active";
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getQuestionBankId() { return questionBankId; }
    public void setQuestionBankId(String questionBankId) { this.questionBankId = questionBankId; }
    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
    public String getKnowledgePointId() { return knowledgePointId; }
    public void setKnowledgePointId(String knowledgePointId) { this.knowledgePointId = knowledgePointId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
