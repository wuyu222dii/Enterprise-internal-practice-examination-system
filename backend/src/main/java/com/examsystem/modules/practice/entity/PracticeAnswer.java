package com.examsystem.modules.practice.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "practice_answers")
public class PracticeAnswer {
    @Id private String id;
    @Column(name = "practice_session_id", nullable = false, length = 32) private String practiceSessionId;
    @Column(name = "question_version_id", nullable = false, length = 32) private String questionVersionId;
    @JsonColumn @Column(name = "answer_json", nullable = false) private String answerJson;
    @Column(name = "is_correct", nullable = false) private boolean correct;
    @CreationTimestamp @Column(name = "answered_at", nullable = false, updatable = false) private Instant answeredAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPracticeSessionId() { return practiceSessionId; }
    public void setPracticeSessionId(String practiceSessionId) { this.practiceSessionId = practiceSessionId; }
    public String getQuestionVersionId() { return questionVersionId; }
    public void setQuestionVersionId(String questionVersionId) { this.questionVersionId = questionVersionId; }
    public String getAnswerJson() { return answerJson; }
    public void setAnswerJson(String answerJson) { this.answerJson = answerJson; }
    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean correct) { this.correct = correct; }
    public Instant getAnsweredAt() { return answeredAt; }
}
