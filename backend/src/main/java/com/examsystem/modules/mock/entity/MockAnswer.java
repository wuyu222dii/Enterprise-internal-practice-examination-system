package com.examsystem.modules.mock.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "mock_answers")
public class MockAnswer {
    @Id private String id;
    @Column(name = "mock_attempt_id", nullable = false, length = 32) private String mockAttemptId;
    @Column(name = "paper_item_id", nullable = false, length = 32) private String paperItemId;
    @JsonColumn @Column(name = "answer_json") private String answerJson;
    @Column(name = "answer_version", nullable = false) private int answerVersion;
    @Column(name = "save_status", nullable = false, length = 20) private String saveStatus = "pending";
    @Column(name = "confirmed_at") private Instant confirmedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getMockAttemptId() { return mockAttemptId; }
    public void setMockAttemptId(String mockAttemptId) { this.mockAttemptId = mockAttemptId; }
    public String getPaperItemId() { return paperItemId; }
    public void setPaperItemId(String paperItemId) { this.paperItemId = paperItemId; }
    public String getAnswerJson() { return answerJson; }
    public void setAnswerJson(String answerJson) { this.answerJson = answerJson; }
    public int getAnswerVersion() { return answerVersion; }
    public void setAnswerVersion(int answerVersion) { this.answerVersion = answerVersion; }
    public String getSaveStatus() { return saveStatus; }
    public void setSaveStatus(String saveStatus) { this.saveStatus = saveStatus; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(Instant confirmedAt) { this.confirmedAt = confirmedAt; }
}
