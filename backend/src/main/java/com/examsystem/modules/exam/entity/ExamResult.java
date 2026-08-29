package com.examsystem.modules.exam.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "exam_results")
public class ExamResult {
    @Id private String id;
    @Column(name = "exam_attempt_id", nullable = false, unique = true, length = 32) private String examAttemptId;
    @Column(name = "total_score", nullable = false) private BigDecimal totalScore;
    @Column(name = "max_score", nullable = false) private BigDecimal maxScore;
    private Boolean passed;
    @JsonColumn @Column(name = "detail_json", nullable = false) private String detailJson;
    @Column(name = "official_valid", nullable = false) private boolean officialValid = true;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamAttemptId() { return examAttemptId; }
    public void setExamAttemptId(String examAttemptId) { this.examAttemptId = examAttemptId; }
    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal totalScore) { this.totalScore = totalScore; }
    public BigDecimal getMaxScore() { return maxScore; }
    public void setMaxScore(BigDecimal maxScore) { this.maxScore = maxScore; }
    public Boolean getPassed() { return passed; }
    public void setPassed(Boolean passed) { this.passed = passed; }
    public String getDetailJson() { return detailJson; }
    public void setDetailJson(String detailJson) { this.detailJson = detailJson; }
    public boolean isOfficialValid() { return officialValid; }
    public void setOfficialValid(boolean officialValid) { this.officialValid = officialValid; }
    public Instant getCreatedAt() { return createdAt; }
}
