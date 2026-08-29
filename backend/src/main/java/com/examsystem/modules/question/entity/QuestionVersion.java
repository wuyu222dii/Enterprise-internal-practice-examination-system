package com.examsystem.modules.question.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "question_versions")
public class QuestionVersion {
    @Id private String id;
    @Column(name = "question_id", nullable = false, length = 32) private String questionId;
    @Column(name = "version_no", nullable = false) private int versionNo;
    @Column(nullable = false, length = 20) private String type;
    @Column(nullable = false, columnDefinition = "text") private String stem;
    @JsonColumn @Column(name = "options_json", nullable = false) private String optionsJson;
    @JsonColumn @Column(name = "standard_answer", nullable = false) private String standardAnswer;
    @Column(columnDefinition = "text") private String explanation;
    @Column(nullable = false, length = 20) private String difficulty = "medium";
    @Column(name = "default_score", nullable = false) private BigDecimal defaultScore = BigDecimal.ONE;
    @Column(nullable = false, length = 20) private String status = "active";
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }
    public int getVersionNo() { return versionNo; }
    public void setVersionNo(int versionNo) { this.versionNo = versionNo; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getStem() { return stem; }
    public void setStem(String stem) { this.stem = stem; }
    public String getOptionsJson() { return optionsJson; }
    public void setOptionsJson(String optionsJson) { this.optionsJson = optionsJson; }
    public String getStandardAnswer() { return standardAnswer; }
    public void setStandardAnswer(String standardAnswer) { this.standardAnswer = standardAnswer; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public BigDecimal getDefaultScore() { return defaultScore; }
    public void setDefaultScore(BigDecimal defaultScore) { this.defaultScore = defaultScore; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
}
