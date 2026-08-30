package com.examsystem.modules.exam.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "exams")
public class Exam {
    @Id private String id;
    @Column(nullable = false, length = 300) private String title;
    @Column(columnDefinition = "text") private String description;
    @Column(nullable = false, length = 30) private String lifecycle = "draft";
    @Column(name = "run_status", nullable = false, length = 20) private String runStatus = "normal";
    @Column(name = "open_start_at") private Instant openStartAt;
    @Column(name = "stop_attempt_at") private Instant stopAttemptAt;
    @Column(name = "published_version_id", length = 32) private String publishedVersionId;
    @Column(name = "result_locked", nullable = false) private boolean resultLocked;
    @JsonColumn @Column(name = "wizard_config", nullable = false) private String wizardConfig = "{}";
    @Column(name = "created_by", nullable = false, length = 32) private String createdBy;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLifecycle() { return lifecycle; }
    public void setLifecycle(String lifecycle) { this.lifecycle = lifecycle; }
    public String getRunStatus() { return runStatus; }
    public void setRunStatus(String runStatus) { this.runStatus = runStatus; }
    public Instant getOpenStartAt() { return openStartAt; }
    public void setOpenStartAt(Instant openStartAt) { this.openStartAt = openStartAt; }
    public Instant getStopAttemptAt() { return stopAttemptAt; }
    public void setStopAttemptAt(Instant stopAttemptAt) { this.stopAttemptAt = stopAttemptAt; }
    public String getPublishedVersionId() { return publishedVersionId; }
    public void setPublishedVersionId(String publishedVersionId) { this.publishedVersionId = publishedVersionId; }
    public boolean isResultLocked() { return resultLocked; }
    public void setResultLocked(boolean resultLocked) { this.resultLocked = resultLocked; }
    public String getWizardConfig() { return wizardConfig; }
    public void setWizardConfig(String wizardConfig) { this.wizardConfig = wizardConfig; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
