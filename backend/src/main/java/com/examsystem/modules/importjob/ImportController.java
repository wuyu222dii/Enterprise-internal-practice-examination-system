package com.examsystem.modules.importjob;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.IdempotencyService;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/import")
@PreAuthorize("hasRole('ADMIN')")
public class ImportController {

    private final ImportService importService;
    private final IdempotencyService idempotencyService;
    private final MetaFactory metaFactory;

    public ImportController(ImportService importService, IdempotencyService idempotencyService, MetaFactory metaFactory) {
        this.importService = importService;
        this.idempotencyService = idempotencyService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate(@RequestParam String questionBankId) {
        byte[] content = importService.downloadTemplate(questionBankId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=import-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }

    @GetMapping("/tasks")
    public ApiResponse<PageDto<Map<String, Object>>> listTasks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(importService.listTasks(page, pageSize), metaFactory.build());
    }

    @PostMapping("/tasks")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createTask(
            @RequestParam MultipartFile file,
            @RequestParam String questionBankId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(importService.createTask(file, questionBankId), metaFactory.build()));
    }

    @GetMapping("/tasks/{id}")
    public ApiResponse<Map<String, Object>> getTask(@PathVariable String id) {
        return ApiResponse.ok(importService.getTask(id), metaFactory.build());
    }

    @GetMapping("/tasks/{id}/preview")
    public ApiResponse<Map<String, Object>> getPreview(@PathVariable String id) {
        return ApiResponse.ok(importService.getPreview(id), metaFactory.build());
    }

    @PostMapping("/tasks/{id}/confirm")
    public ApiResponse<Object> confirm(
            @PathVariable String id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> body
    ) {
        Runnable action = () -> importService.confirm(id, String.valueOf(body.get("confirmToken")));
        if (idempotencyKey != null) {
            idempotencyService.execute(idempotencyKey, "import:confirm:" + id, Object.class, () -> {
                action.run();
                return Collections.emptyMap();
            });
        } else {
            action.run();
        }
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/tasks/{id}/cancel")
    public ApiResponse<Object> cancel(@PathVariable String id) {
        importService.cancel(id);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/tasks/{id}/revalidate")
    public ApiResponse<Object> revalidate(@PathVariable String id) {
        importService.revalidate(id);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/tasks/{id}/errors")
    public ResponseEntity<byte[]> downloadErrors(@PathVariable String id) {
        byte[] content = importService.downloadTemplate(importService.getTask(id).get("questionBankId").toString());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=import-errors.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }
}
