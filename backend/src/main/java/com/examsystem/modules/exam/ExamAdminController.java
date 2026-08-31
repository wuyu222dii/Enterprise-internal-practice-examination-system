package com.examsystem.modules.exam;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import com.examsystem.modules.outage.OutageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/exams")
@PreAuthorize("hasRole('ADMIN')")
public class ExamAdminController {

    private final ExamService examService;
    private final OutageService outageService;
    private final MetaFactory metaFactory;

    public ExamAdminController(ExamService examService, OutageService outageService, MetaFactory metaFactory) {
        this.examService = examService;
        this.outageService = outageService;
        this.metaFactory = metaFactory;
    }

    @GetMapping
    public ApiResponse<PageDto<Map<String, Object>>> listExams(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(examService.listAdminExams(page, pageSize), metaFactory.build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createExam(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(examService.createExam(body), metaFactory.build()));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getExam(@PathVariable String id) {
        return ApiResponse.ok(examService.getAdminExam(id), metaFactory.build());
    }

    @PatchMapping("/{id}")
    public ApiResponse<Object> patchExam(@PathVariable String id, @RequestBody Map<String, Object> body) {
        examService.patchExam(id, body);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/{id}/description-revisions")
    public ApiResponse<List<Map<String, Object>>> listDescriptionRevisions(@PathVariable String id) {
        return ApiResponse.ok(examService.listDescriptionRevisions(id), metaFactory.build());
    }

    @PutMapping("/{id}/wizard/basic")
    public ApiResponse<Object> wizardBasic(@PathVariable String id, @RequestBody Map<String, Object> body) {
        examService.updateWizardStep(id, "basic", body);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PutMapping("/{id}/wizard/rules")
    public ApiResponse<Object> wizardRules(@PathVariable String id, @RequestBody Map<String, Object> body) {
        examService.updateWizardStep(id, "rules", body);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PutMapping("/{id}/wizard/assignees")
    public ApiResponse<Object> wizardAssignees(@PathVariable String id, @RequestBody Map<String, Object> body) {
        examService.updateWizardStep(id, "assignees", body);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PutMapping("/{id}/wizard/visibility")
    public ApiResponse<Object> wizardVisibility(@PathVariable String id, @RequestBody Map<String, Object> body) {
        examService.updateWizardStep(id, "visibility", body);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PutMapping("/{id}/wizard/review")
    public ApiResponse<Object> wizardReview(@PathVariable String id, @RequestBody Map<String, Object> body) {
        examService.updateWizardStep(id, "review", body);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/{id}/preflight")
    public ApiResponse<Map<String, Object>> preflight(@PathVariable String id) {
        return ApiResponse.ok(examService.preflight(id), metaFactory.build());
    }

    @PostMapping("/{id}/publish")
    public ApiResponse<Object> publish(@PathVariable String id) {
        examService.publishExam(id);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<Object> cancel(@PathVariable String id, @RequestBody Map<String, String> body) {
        examService.cancelExam(id, body.get("employeeVisibleReason"), body.get("internalReason"));
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/{id}/monitor")
    public ApiResponse<Map<String, Object>> monitor(@PathVariable String id) {
        return ApiResponse.ok(examService.getMonitor(id), metaFactory.build());
    }

    @PostMapping("/{id}/pause")
    public ApiResponse<Object> pauseExam(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        outageService.pauseExam(id, body != null ? body.get("reason") : null);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }
}
