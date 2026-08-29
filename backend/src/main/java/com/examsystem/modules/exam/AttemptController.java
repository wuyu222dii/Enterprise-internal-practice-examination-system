package com.examsystem.modules.exam;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.IdempotencyService;
import com.examsystem.common.MetaFactory;
import com.examsystem.modules.exam.dto.SaveAnswerRequest;
import com.examsystem.modules.exam.dto.SaveAnswerResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
public class AttemptController {

    private final ExamService examService;
    private final IdempotencyService idempotencyService;
    private final MetaFactory metaFactory;

    public AttemptController(ExamService examService, IdempotencyService idempotencyService, MetaFactory metaFactory) {
        this.examService = examService;
        this.idempotencyService = idempotencyService;
        this.metaFactory = metaFactory;
    }

    @PostMapping("/exams/{id}/attempts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startAttempt(
            @PathVariable String id,
            @RequestHeader("Idempotency-Key") String idempotencyKey
    ) {
        try {
            Map<String, Object> result = idempotencyService.execute(
                    idempotencyKey,
                    "exam:start:" + id,
                    Map.class,
                    () -> examService.startAttempt(id)
            );
            return ResponseEntity.ok(ApiResponse.ok(result, metaFactory.build()));
        } catch (ExamService.AttemptResumeException ex) {
            return ResponseEntity.ok(ApiResponse.ok(ex.getResponse(), metaFactory.build()));
        }
    }

    @GetMapping("/attempts/{id}")
    public ApiResponse<Map<String, Object>> getAttempt(@PathVariable String id) {
        return ApiResponse.ok(examService.getAttemptDetail(id), metaFactory.build());
    }

    @GetMapping("/attempts/{id}/paper")
    public ApiResponse<Map<String, Object>> getPaper(@PathVariable String id) {
        return ApiResponse.ok(examService.getPaper(id), metaFactory.build());
    }

    @PutMapping("/attempts/{id}/answers/{itemId}")
    public ApiResponse<SaveAnswerResponse> saveAnswer(
            @PathVariable String id,
            @PathVariable String itemId,
            @Valid @RequestBody SaveAnswerRequest request
    ) {
        return ApiResponse.ok(examService.saveAnswer(id, itemId, request), metaFactory.build());
    }

    @PostMapping("/attempts/{id}/submit")
    public ApiResponse<Object> submit(
            @PathVariable String id,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : "manual";
        idempotencyService.execute(idempotencyKey, "exam:submit:" + id, Object.class, () -> {
            examService.submitAttempt(id, reason);
            return Collections.emptyMap();
        });
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/attempts/{id}/result")
    public ApiResponse<Map<String, Object>> getResult(@PathVariable String id) {
        return ApiResponse.ok(examService.getAttemptResult(id), metaFactory.build());
    }
}
