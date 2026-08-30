package com.examsystem.modules.report;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;
    private final MetaFactory metaFactory;

    public ReportController(ReportService reportService, MetaFactory metaFactory) {
        this.reportService = reportService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/admin/exams/{id}/scores/summary")
    public ApiResponse<Map<String, Object>> getScoreSummary(@PathVariable String id) {
        return ApiResponse.ok(reportService.getScoreSummary(id), metaFactory.build());
    }

    @GetMapping("/admin/exams/{id}/scores/employees")
    public ApiResponse<PageDto<Map<String, Object>>> listEmployeeScores(
            @PathVariable String id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(reportService.listEmployeeScores(id, page, pageSize), metaFactory.build());
    }

    @GetMapping("/admin/exams/{id}/attempts")
    public ApiResponse<PageDto<Map<String, Object>>> listAttempts(
            @PathVariable String id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(reportService.listAttempts(id, page, pageSize), metaFactory.build());
    }

    @GetMapping("/admin/exams/{id}/attempts/{attemptId}")
    public ApiResponse<Map<String, Object>> getAttempt(
            @PathVariable String id,
            @PathVariable String attemptId
    ) {
        return ApiResponse.ok(reportService.getAttemptDetail(id, attemptId), metaFactory.build());
    }

    @PostMapping("/admin/exams/{id}/attempts/{attemptId}/void")
    public ApiResponse<Object> voidAttempt(
            @PathVariable String id,
            @PathVariable String attemptId,
            @RequestBody Map<String, Object> body
    ) {
        reportService.voidAttempt(
                id,
                attemptId,
                String.valueOf(body.get("employeeVisibleReason")),
                String.valueOf(body.get("internalReason"))
        );
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/admin/exams/{id}/exports")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createExport(@PathVariable String id) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.ok(reportService.createExport(id), metaFactory.build()));
    }

    @GetMapping("/admin/exports/{jobId}")
    public ApiResponse<Map<String, Object>> getExportJob(@PathVariable String jobId) {
        return ApiResponse.ok(reportService.getExportJob(jobId), metaFactory.build());
    }

    @GetMapping("/admin/exports/{jobId}/download")
    public ResponseEntity<byte[]> downloadExport(@PathVariable String jobId) {
        byte[] content = reportService.downloadExport(jobId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"export-" + jobId + ".xlsx\"")
                .contentType(org.springframework.http.MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }
}
