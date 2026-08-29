package com.examsystem.modules.exam.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "exam_paper_items")
public class ExamPaperItem {
    @Id private String id;
    @Column(name = "exam_attempt_id", nullable = false, length = 32) private String examAttemptId;
    @Column(name = "item_order", nullable = false) private int itemOrder;
    @Column(name = "question_version_id", nullable = false, length = 32) private String questionVersionId;
    @Column(nullable = false) private BigDecimal score;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamAttemptId() { return examAttemptId; }
    public void setExamAttemptId(String examAttemptId) { this.examAttemptId = examAttemptId; }
    public int getItemOrder() { return itemOrder; }
    public void setItemOrder(int itemOrder) { this.itemOrder = itemOrder; }
    public String getQuestionVersionId() { return questionVersionId; }
    public void setQuestionVersionId(String questionVersionId) { this.questionVersionId = questionVersionId; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
}
