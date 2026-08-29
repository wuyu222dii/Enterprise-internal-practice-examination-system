package com.examsystem.modules.question.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "categories")
public class Category {
    @Id private String id;
    @Column(name = "question_bank_id", nullable = false, length = 32) private String questionBankId;
    @Column(nullable = false, length = 200) private String name;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getQuestionBankId() { return questionBankId; }
    public void setQuestionBankId(String questionBankId) { this.questionBankId = questionBankId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Instant getCreatedAt() { return createdAt; }
}
