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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void log(String actionType, String targetType, String targetId, Object before, Object after, String reason) {
        AuditLog log = new AuditLog();
        log.setId(IdGenerator.newId("aud"));
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
        if (log.getBeforeJson() != null && !log.getBeforeJson().isBlank()) {
            dto.put("before", JsonHelper.parse(log.getBeforeJson()));
        }
        if (log.getAfterJson() != null && !log.getAfterJson().isBlank()) {
            dto.put("after", JsonHelper.parse(log.getAfterJson()));
        }
        return dto;
    }
}
