package com.examsystem.modules.audit.entity;

import com.examsystem.common.JsonColumn;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id private String id;
    @Column(name = "occurred_at", nullable = false, updatable = false) private Instant occurredAt;
    @Column(name = "actor_employee_id", length = 32) private String actorEmployeeId;
    @Column(name = "action_type", nullable = false, length = 100) private String actionType;
    @Column(name = "target_type", length = 100) private String targetType;
    @Column(name = "target_id", length = 32) private String targetId;
    @JsonColumn @Column(name = "before_json") private String beforeJson;
    @JsonColumn @Column(name = "after_json") private String afterJson;
    @Column(columnDefinition = "text") private String reason;
    @Column(name = "request_id", length = 64) private String requestId;
    @Column(name = "client_ip", length = 45) private String clientIp;
    @Column(name = "chain_seq") private Long chainSeq;
    @Column(name = "content_hash", length = 64) private String contentHash;
    @Column(name = "prev_hash", length = 64) private String prevHash;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }
    public String getActorEmployeeId() { return actorEmployeeId; }
    public void setActorEmployeeId(String actorEmployeeId) { this.actorEmployeeId = actorEmployeeId; }
    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getBeforeJson() { return beforeJson; }
    public void setBeforeJson(String beforeJson) { this.beforeJson = beforeJson; }
    public String getAfterJson() { return afterJson; }
    public void setAfterJson(String afterJson) { this.afterJson = afterJson; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public String getClientIp() { return clientIp; }
    public void setClientIp(String clientIp) { this.clientIp = clientIp; }
    public Long getChainSeq() { return chainSeq; }
    public void setChainSeq(Long chainSeq) { this.chainSeq = chainSeq; }
    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }
    public String getPrevHash() { return prevHash; }
    public void setPrevHash(String prevHash) { this.prevHash = prevHash; }
}
