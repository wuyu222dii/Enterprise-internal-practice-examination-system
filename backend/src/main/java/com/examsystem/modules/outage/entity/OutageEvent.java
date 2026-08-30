package com.examsystem.modules.outage.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "outage_events")
public class OutageEvent {
    @Id private String id;
    @Column(nullable = false, length = 30) private String status;
    @Column(name = "candidate_started_at") private Instant candidateStartedAt;
    @Column(name = "open_interval_end") private Instant openIntervalEnd;
    @JsonColumn @Column(name = "affected_exam_ids", nullable = false) private String affectedExamIds = "[]";
    @Column(name = "latest_proposal_version", nullable = false) private int latestProposalVersion;
    @Column(nullable = false, length = 20) private String source = "manual";
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCandidateStartedAt() { return candidateStartedAt; }
    public void setCandidateStartedAt(Instant candidateStartedAt) { this.candidateStartedAt = candidateStartedAt; }
    public Instant getOpenIntervalEnd() { return openIntervalEnd; }
    public void setOpenIntervalEnd(Instant openIntervalEnd) { this.openIntervalEnd = openIntervalEnd; }
    public String getAffectedExamIds() { return affectedExamIds; }
    public void setAffectedExamIds(String affectedExamIds) { this.affectedExamIds = affectedExamIds; }
    public int getLatestProposalVersion() { return latestProposalVersion; }
    public void setLatestProposalVersion(int latestProposalVersion) { this.latestProposalVersion = latestProposalVersion; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
