package com.examsystem.modules.outage.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "outage_proposals")
public class OutageProposal {
    @Id private String id;
    @Column(name = "outage_event_id", nullable = false, length = 32) private String outageEventId;
    @Column(nullable = false) private int version;
    @JsonColumn @Column(name = "proposal_json", nullable = false) private String proposalJson;
    @Column(nullable = false, length = 30) private String status = "pending";
    @Column(name = "decided_by", length = 32) private String decidedBy;
    @Column(name = "decided_at") private Instant decidedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOutageEventId() { return outageEventId; }
    public void setOutageEventId(String outageEventId) { this.outageEventId = outageEventId; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getProposalJson() { return proposalJson; }
    public void setProposalJson(String proposalJson) { this.proposalJson = proposalJson; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }
    public Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(Instant decidedAt) { this.decidedAt = decidedAt; }
}
