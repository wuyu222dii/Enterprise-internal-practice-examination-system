package com.examsystem.modules.exam.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "exam_published_versions")
public class ExamPublishedVersion {
    @Id private String id;
    @Column(name = "exam_id", nullable = false, length = 32) private String examId;
    @Column(name = "version_no", nullable = false) private int versionNo;
    @JsonColumn @Column(name = "config_json", nullable = false) private String configJson;
    @Column(name = "published_at", nullable = false) private Instant publishedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public int getVersionNo() { return versionNo; }
    public void setVersionNo(int versionNo) { this.versionNo = versionNo; }
    public String getConfigJson() { return configJson; }
    public void setConfigJson(String configJson) { this.configJson = configJson; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
}
