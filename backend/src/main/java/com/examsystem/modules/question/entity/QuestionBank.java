package com.examsystem.modules.question.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "question_banks")
public class QuestionBank {
    @Id private String id;
    @Column(nullable = false, unique = true, length = 200) private String name;
    @Column(nullable = false, length = 20) private String status = "active";
    @Column(name = "practice_enabled", nullable = false) private boolean practiceEnabled;
    @Column(name = "mock_enabled", nullable = false) private boolean mockEnabled;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isPracticeEnabled() { return practiceEnabled; }
    public void setPracticeEnabled(boolean practiceEnabled) { this.practiceEnabled = practiceEnabled; }
    public boolean isMockEnabled() { return mockEnabled; }
    public void setMockEnabled(boolean mockEnabled) { this.mockEnabled = mockEnabled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
