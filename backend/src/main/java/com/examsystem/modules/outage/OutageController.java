package com.examsystem.modules.outage;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/outage-events")
@PreAuthorize("hasAnyRole('ADMIN', 'OUTAGE_DISPOSITION')")
public class OutageController {

    private final OutageService outageService;
    private final MetaFactory metaFactory;

    public OutageController(OutageService outageService, MetaFactory metaFactory) {
        this.outageService = outageService;
        this.metaFactory = metaFactory;
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> createEvent(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> affectedExamIds = body != null && body.get("affectedExamIds") instanceof List<?>
                ? ((List<?>) body.get("affectedExamIds")).stream().map(String::valueOf).toList()
                : List.of();
        return ApiResponse.ok(outageService.createEvent(affectedExamIds), metaFactory.build());
    }

    @PostMapping("/detect")
    public ApiResponse<Map<String, Object>> detect(@RequestBody(required = false) Map<String, Object> body) {
        List<String> affectedExamIds = body != null && body.get("affectedExamIds") instanceof List<?>
                ? ((List<?>) body.get("affectedExamIds")).stream().map(String::valueOf).toList()
                : List.of();
        String reason = body != null && body.get("reason") != null
                ? String.valueOf(body.get("reason"))
                : "injected health failure";
        return ApiResponse.ok(outageService.detectAndPause(affectedExamIds, reason, true), metaFactory.build());
    }

    @GetMapping
    public ApiResponse<PageDto<Map<String, Object>>> listEvents(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(outageService.listEvents(page, pageSize), metaFactory.build());
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getEvent(@PathVariable String id) {
        return ApiResponse.ok(outageService.getEvent(id), metaFactory.build());
    }

    @PostMapping("/{id}/proposals/{version}/confirm")
    public ApiResponse<Object> confirmProposal(
            @PathVariable String id,
            @PathVariable int version,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String note = body != null ? body.get("confirmationNote") : null;
        outageService.confirmProposal(id, version, note);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/{id}/proposals/{version}/reject")
    public ApiResponse<Object> rejectProposal(
            @PathVariable String id,
            @PathVariable int version,
            @RequestBody Map<String, String> body
    ) {
        outageService.rejectProposal(id, version, body.get("rejectReason"));
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }
}
