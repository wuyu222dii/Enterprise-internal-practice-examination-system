package com.examsystem.modules.mock.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "mock_results")
public class MockResult {
    @Id private String id;
    @Column(name = "mock_attempt_id", nullable = false, unique = true, length = 32) private String mockAttemptId;
    @Column(name = "total_score", nullable = false) private BigDecimal totalScore;
    @Column(name = "max_score", nullable = false) private BigDecimal maxScore;
    @JsonColumn @Column(name = "detail_json", nullable = false) private String detailJson;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMockAttemptId() { return mockAttemptId; }
    public void setMockAttemptId(String mockAttemptId) { this.mockAttemptId = mockAttemptId; }
    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal totalScore) { this.totalScore = totalScore; }
    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }
    public String getDetailJson() { return detailJson; }
    public void setDetailJson(String detailJson) { this.detailJson = detailJson; }
    public Instant getCreatedAt() { return createdAt; }
}
