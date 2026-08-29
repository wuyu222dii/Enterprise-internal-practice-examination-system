package com.examsystem.modules.mock;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.IdempotencyService;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import com.examsystem.modules.mock.dto.CreateMockAttemptRequest;
import com.examsystem.modules.mock.dto.SaveAnswerRequest;
import com.examsystem.modules.mock.dto.SaveAnswerResponse;
import com.examsystem.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/mock")
public class MockController {

    private final MockService mockService;
    private final IdempotencyService idempotencyService;
    private final MetaFactory metaFactory;

    public MockController(MockService mockService, IdempotencyService idempotencyService, MetaFactory metaFactory) {
        this.mockService = mockService;
        this.idempotencyService = idempotencyService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/banks")
    public ApiResponse<List<Map<String, Object>>> listBanks() {
        return ApiResponse.ok(mockService.listBanks(), metaFactory.build());
    }

    @GetMapping("/attempts/active")
    public ApiResponse<Map<String, Object>> getActiveAttempt() {
        return ApiResponse.ok(mockService.getActiveAttempt(), metaFactory.build());
    }

    @PostMapping("/attempts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createAttempt(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateMockAttemptRequest request
    ) {
        Map<String, Object> result = idempotencyService.execute(
                idempotencyKey,
                "mock:create:" + SecurityUtils.getCurrentEmployeeId(),
                Map.class,
                () -> mockService.createAttempt(request)
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(result, metaFactory.build()));
    }

    @GetMapping("/attempts/{id}")
    public ApiResponse<Map<String, Object>> getAttempt(@PathVariable String id) {
        return ApiResponse.ok(mockService.getAttempt(id), metaFactory.build());
    }

    @GetMapping("/attempts/{id}/paper")
    public ApiResponse<Map<String, Object>> getPaper(@PathVariable String id) {
        return ApiResponse.ok(mockService.getPaper(id), metaFactory.build());
    }

    @PutMapping("/attempts/{id}/answers/{itemId}")
    public ApiResponse<SaveAnswerResponse> saveAnswer(
            @PathVariable String id,
            @PathVariable String itemId,
            @Valid @RequestBody SaveAnswerRequest request
    ) {
        return ApiResponse.ok(mockService.saveAnswer(id, itemId, request), metaFactory.build());
    }

    @PostMapping("/attempts/{id}/submit")
    public ApiResponse<Object> submit(
            @PathVariable String id,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        idempotencyService.execute(idempotencyKey, "mock:submit:" + id, Object.class, () -> {
            mockService.submit(id);
            return Collections.emptyMap();
        });
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/attempts/{id}/abandon")
    public ApiResponse<Object> abandon(@PathVariable String id) {
        mockService.abandon(id);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/attempts/{id}/result")
    public ApiResponse<Map<String, Object>> getResult(@PathVariable String id) {
        return ApiResponse.ok(mockService.getResult(id), metaFactory.build());
    }

    @GetMapping("/records")
    public ApiResponse<PageDto<Map<String, Object>>> listRecords(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(mockService.listRecords(page, pageSize), metaFactory.build());
    }
}
