package com.examsystem.modules.audit;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditService auditService;
    private final MetaFactory metaFactory;

    public AuditController(AuditService auditService, MetaFactory metaFactory) {
        this.auditService = auditService;
        this.metaFactory = metaFactory;
    }

    @GetMapping
    public ApiResponse<PageDto<Map<String, Object>>> listAuditLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetId
    ) {
        return ApiResponse.ok(
                auditService.list(page, pageSize, actionType, targetType, targetId),
                metaFactory.build()
        );
    }
}
