package com.examsystem.modules.exam.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "exam_rule_lines")
public class ExamRuleLine {
    @Id private String id;
    @Column(name = "published_version_id", nullable = false, length = 32) private String publishedVersionId;
    @Column(name = "line_order", nullable = false) private int lineOrder;
    @JsonColumn @Column(name = "filter_json", nullable = false) private String filterJson;
    @Column(name = "draw_count", nullable = false) private int drawCount;
    @Column(name = "score_per_question", nullable = false) private BigDecimal scorePerQuestion;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPublishedVersionId() { return publishedVersionId; }
    public void setPublishedVersionId(String publishedVersionId) { this.publishedVersionId = publishedVersionId; }
    public int getLineOrder() { return lineOrder; }
    public void setLineOrder(int lineOrder) { this.lineOrder = lineOrder; }
    public String getFilterJson() { return filterJson; }
    public void setFilterJson(String filterJson) { this.filterJson = filterJson; }
    public int getDrawCount() { return drawCount; }
    public void setDrawCount(int drawCount) { this.drawCount = drawCount; }
    public BigDecimal getScorePerQuestion() { return scorePerQuestion; }
    public void setScorePerQuestion(BigDecimal scorePerQuestion) { this.scorePerQuestion = scorePerQuestion; }
}
