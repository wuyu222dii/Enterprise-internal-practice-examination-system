package com.examsystem.modules.mock.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mock_paper_items")
public class MockPaperItem {
    @Id private String id;
    @Column(name = "mock_attempt_id", nullable = false, length = 32) private String mockAttemptId;
    @Column(name = "item_order", nullable = false) private int itemOrder;
    @Column(name = "question_version_id", nullable = false, length = 32) private String questionVersionId;
    @Column(nullable = false) private BigDecimal score;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMockAttemptId() { return mockAttemptId; }
    public void setMockAttemptId(String mockAttemptId) { this.mockAttemptId = mockAttemptId; }
    public int getItemOrder() { return itemOrder; }
    public void setItemOrder(int itemOrder) { this.itemOrder = itemOrder; }
    public String getQuestionVersionId() { return questionVersionId; }
    public void setQuestionVersionId(String questionVersionId) { this.questionVersionId = questionVersionId; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
}
