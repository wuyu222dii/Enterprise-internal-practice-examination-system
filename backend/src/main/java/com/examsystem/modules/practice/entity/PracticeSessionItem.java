package com.examsystem.modules.practice.entity;

import jakarta.persistence.*;
@Entity
@Table(name = "practice_session_items")
public class PracticeSessionItem {
    @Id private String id;
    @Column(name = "practice_session_id", nullable = false, length = 32) private String practiceSessionId;
    @Column(name = "item_order", nullable = false) private int itemOrder;
    @Column(name = "question_version_id", nullable = false, length = 32) private String questionVersionId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPracticeSessionId() { return practiceSessionId; }
    public void setPracticeSessionId(String practiceSessionId) { this.practiceSessionId = practiceSessionId; }
    public int getItemOrder() { return itemOrder; }
    public void setItemOrder(int itemOrder) { this.itemOrder = itemOrder; }
    public String getQuestionVersionId() { return questionVersionId; }
    public void setQuestionVersionId(String questionVersionId) { this.questionVersionId = questionVersionId; }
}
