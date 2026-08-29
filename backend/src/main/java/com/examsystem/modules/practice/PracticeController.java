package com.examsystem.modules.practice;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import com.examsystem.modules.practice.dto.CreatePracticeSessionRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/practice")
public class PracticeController {

    private final PracticeService practiceService;
    private final MetaFactory metaFactory;

    public PracticeController(PracticeService practiceService, MetaFactory metaFactory) {
        this.practiceService = practiceService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/banks")
    public ApiResponse<List<Map<String, Object>>> listBanks() {
        return ApiResponse.ok(practiceService.listBanks(), metaFactory.build());
    }

    @GetMapping("/sessions/active")
    public ApiResponse<Map<String, Object>> getActiveSession() {
        return ApiResponse.ok(practiceService.getActiveSession(), metaFactory.build());
    }

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSession(
            @Valid @RequestBody CreatePracticeSessionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(practiceService.createSession(request), metaFactory.build()));
    }

    @GetMapping("/sessions/{id}")
    public ApiResponse<Map<String, Object>> getSession(@PathVariable String id) {
        return ApiResponse.ok(practiceService.getSession(id), metaFactory.build());
    }

    @PostMapping("/sessions/{id}/answers")
    public ApiResponse<Map<String, Object>> submitAnswer(
            @PathVariable String id,
            @RequestBody Map<String, Object> body
    ) {
        @SuppressWarnings("unchecked")
        List<String> answer = (List<String>) body.get("answer");
        return ApiResponse.ok(
                practiceService.submitAnswer(id, String.valueOf(body.get("questionVersionId")), answer),
                metaFactory.build()
        );
    }

    @PostMapping("/sessions/{id}/finish")
    public ApiResponse<Object> finishSession(@PathVariable String id) {
        practiceService.finishSession(id);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/wrong-book")
    public ApiResponse<PageDto<Map<String, Object>>> listWrongBook(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(practiceService.listWrongBook(page, pageSize), metaFactory.build());
    }

    @GetMapping("/records")
    public ApiResponse<PageDto<Map<String, Object>>> listRecords(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(practiceService.listRecords(page, pageSize), metaFactory.build());
    }
}
