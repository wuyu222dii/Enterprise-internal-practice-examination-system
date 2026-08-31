package com.examsystem.modules.audit;

import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.LogSanitizer;
import com.examsystem.common.PageDto;
import com.examsystem.common.RequestContext;
import com.examsystem.modules.audit.entity.AuditLog;
import com.examsystem.modules.audit.repository.AuditLogRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public synchronized void log(
            String actionType,
            String targetType,
            String targetId,
            Object before,
            Object after,
            String reason
    ) {
        AuditLog previous = auditLogRepository.findTopByChainSeqIsNotNullOrderByChainSeqDesc().orElse(null);
        long nextSeq = previous != null && previous.getChainSeq() != null ? previous.getChainSeq() + 1 : 1L;
        String prevHash = previous != null ? blankToEmpty(previous.getContentHash()) : "";

        AuditLog log = new AuditLog();
        log.setId(IdGenerator.newId("aud"));
        log.setOccurredAt(Instant.now());
        log.setActorEmployeeId(SecurityUtils.getCurrentEmployeeId());
        log.setActionType(actionType);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        if (before != null) {
            log.setBeforeJson(JsonHelper.toJson(LogSanitizer.redact(before)));
        }
        if (after != null) {
            log.setAfterJson(JsonHelper.toJson(LogSanitizer.redact(after)));
        }
        log.setReason(reason);
        log.setRequestId(RequestContext.getRequestId());
        log.setChainSeq(nextSeq);
        log.setPrevHash(prevHash.isEmpty() ? null : prevHash);
        log.setContentHash(computeContentHash(log, prevHash));
        auditLogRepository.save(log);
    }

    public PageDto<Map<String, Object>> list(int page, int pageSize, String actionType, String targetType, String targetId) {
        Page<AuditLog> result = auditLogRepository.search(
                blankToEmpty(actionType),
                blankToEmpty(targetType),
                blankToEmpty(targetId),
                PageRequest.of(page - 1, pageSize)
        );
        List<Map<String, Object>> items = result.getContent().stream().map(this::toDto).toList();
        return new PageDto<>(items, result.getTotalElements(), page, pageSize);
    }

    public PageDto<Map<String, Object>> list(int page, int pageSize) {
        return list(page, pageSize, null, null, null);
    }

    public Map<String, Object> verifyIntegrity() {
        List<AuditLog> chain = auditLogRepository.findByChainSeqIsNotNullOrderByChainSeqAsc();
        String expectedPrev = "";
        for (AuditLog log : chain) {
            String actualPrev = blankToEmpty(log.getPrevHash());
            if (!expectedPrev.equals(actualPrev)) {
                return integrityResult(false, chain.size(), log.getId(), "哈希链前驱不匹配，日志只读，禁止修复原记录");
            }
            String expectedHash = computeContentHash(log, actualPrev);
            if (log.getContentHash() == null || !expectedHash.equals(log.getContentHash())) {
                return integrityResult(false, chain.size(), log.getId(), "内容哈希校验失败，日志只读，禁止修复原记录");
            }
            expectedPrev = blankToEmpty(log.getContentHash());
        }
        return integrityResult(true, chain.size(), null, chain.isEmpty() ? "暂无已链接审计记录" : "哈希链完整");
    }

    private static Map<String, Object> integrityResult(boolean valid, int checkedCount, String firstBrokenId, String message) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("valid", valid);
        dto.put("checkedCount", checkedCount);
        dto.put("firstBrokenId", firstBrokenId);
        dto.put("message", message);
        dto.put("repairAllowed", false);
        return dto;
    }

    private static String computeContentHash(AuditLog log, String prevHash) {
        String payload = String.join("|",
                log.getChainSeq() != null ? log.getChainSeq().toString() : "",
                blankToEmpty(log.getId()),
                blankToEmpty(log.getActorEmployeeId()),
                blankToEmpty(log.getActionType()),
                blankToEmpty(log.getTargetType()),
                blankToEmpty(log.getTargetId()),
                blankToEmpty(log.getReason()),
                blankToEmpty(log.getRequestId()),
                blankToEmpty(prevHash)
        );
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String blankToEmpty(String value) {
        return value == null || value.isBlank() ? "" : value;
    }

    private Map<String, Object> toDto(AuditLog log) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", log.getId());
        dto.put("occurredAt", log.getOccurredAt());
        dto.put("actorEmployeeId", log.getActorEmployeeId());
        dto.put("actionType", log.getActionType());
        dto.put("targetType", log.getTargetType());
        dto.put("targetId", log.getTargetId());
        dto.put("reason", log.getReason());
        dto.put("requestId", log.getRequestId());
        dto.put("chainSeq", log.getChainSeq());
        if (log.getBeforeJson() != null && !log.getBeforeJson().isBlank()) {
            dto.put("before", JsonHelper.parse(log.getBeforeJson()));
        }
        if (log.getAfterJson() != null && !log.getAfterJson().isBlank()) {
            dto.put("after", JsonHelper.parse(log.getAfterJson()));
        }
        return dto;
    }
}
