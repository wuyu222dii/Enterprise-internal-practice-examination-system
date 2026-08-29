package com.examsystem.modules.exam.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "exam_answers")
public class ExamAnswer {
    @Id private String id;
    @Column(name = "exam_attempt_id", nullable = false, length = 32) private String examAttemptId;
    @Column(name = "paper_item_id", nullable = false, length = 32) private String paperItemId;
    @JsonColumn @Column(name = "answer_json") private String answerJson;
    @Column(name = "answer_version", nullable = false) private int answerVersion;
    @Column(name = "save_status", nullable = false, length = 20) private String saveStatus = "pending";
    @Column(name = "confirmed_at") private Instant confirmedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamAttemptId() { return examAttemptId; }
    public void setExamAttemptId(String examAttemptId) { this.examAttemptId = examAttemptId; }
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
