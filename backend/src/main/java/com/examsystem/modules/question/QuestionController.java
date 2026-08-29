package com.examsystem.modules.question;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.common.PageDto;
import com.examsystem.modules.question.dto.CreateQuestionBankRequest;
import com.examsystem.modules.question.dto.CreateQuestionRequest;
import com.examsystem.modules.question.dto.QuestionVersionInput;
import com.examsystem.modules.question.dto.UpdateQuestionBankRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class QuestionController {

    private final QuestionService questionService;
    private final MetaFactory metaFactory;

    public QuestionController(QuestionService questionService, MetaFactory metaFactory) {
        this.questionService = questionService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/question-banks")
    public ApiResponse<List<Map<String, Object>>> listBanks() {
        return ApiResponse.ok(questionService.listBanks(), metaFactory.build());
    }

    @PostMapping("/question-banks")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBank(
            @Valid @RequestBody CreateQuestionBankRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(questionService.createBank(request), metaFactory.build()));
    }

    @PatchMapping("/question-banks/{id}")
    public ApiResponse<Map<String, Object>> updateBank(
            @PathVariable String id,
            @RequestBody UpdateQuestionBankRequest request
    ) {
        return ApiResponse.ok(questionService.updateBank(id, request), metaFactory.build());
    }

    @GetMapping("/question-banks/{bankId}/categories")
    public ApiResponse<List<Map<String, Object>>> listCategories(@PathVariable String bankId) {
        return ApiResponse.ok(questionService.listCategories(bankId), metaFactory.build());
    }

    @PostMapping("/question-banks/{bankId}/categories")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createCategory(
            @PathVariable String bankId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(questionService.createCategory(bankId, body.get("name")), metaFactory.build()));
    }

    @PatchMapping("/categories/{id}")
    public ApiResponse<Object> updateCategory(@PathVariable String id, @RequestBody Map<String, String> body) {
        questionService.updateCategory(id, body.get("name"));
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/categories/{categoryId}/knowledge-points")
    public ApiResponse<List<Map<String, Object>>> listKnowledgePoints(@PathVariable String categoryId) {
        return ApiResponse.ok(questionService.listKnowledgePoints(categoryId), metaFactory.build());
    }

    @PostMapping("/categories/{categoryId}/knowledge-points")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createKnowledgePoint(
            @PathVariable String categoryId,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(questionService.createKnowledgePoint(categoryId, body.get("name")), metaFactory.build()));
    }

    @PatchMapping("/knowledge-points/{id}")
    public ApiResponse<Object> updateKnowledgePoint(@PathVariable String id, @RequestBody Map<String, String> body) {
        questionService.updateKnowledgePoint(id, body.get("name"));
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/question-banks/{bankId}/questions")
    public ApiResponse<PageDto<Map<String, Object>>> listQuestions(
            @PathVariable String bankId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(questionService.listQuestions(bankId, page, pageSize), metaFactory.build());
    }

    @PostMapping("/question-banks/{bankId}/questions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createQuestion(
            @PathVariable String bankId,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(questionService.createQuestion(bankId, request), metaFactory.build()));
    }

    @GetMapping("/questions/{id}")
    public ApiResponse<Map<String, Object>> getQuestion(@PathVariable String id) {
        return ApiResponse.ok(questionService.getQuestion(id), metaFactory.build());
    }

    @PatchMapping("/questions/{id}")
    public ApiResponse<Object> updateQuestion(@PathVariable String id, @RequestBody Map<String, String> body) {
        questionService.updateQuestion(id, body.get("status"), body.get("categoryId"), body.get("knowledgePointId"));
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/questions/{id}/versions")
    public ApiResponse<List<Map<String, Object>>> listVersions(@PathVariable String id) {
        return ApiResponse.ok(questionService.listVersions(id), metaFactory.build());
    }

    @PostMapping("/questions/{id}/versions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createVersion(
            @PathVariable String id,
            @Valid @RequestBody QuestionVersionInput input
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(questionService.createVersion(id, input), metaFactory.build()));
    }

    @GetMapping("/question-versions/{versionId}")
    public ApiResponse<Map<String, Object>> getVersion(@PathVariable String versionId) {
        return ApiResponse.ok(questionService.getVersion(versionId), metaFactory.build());
    }
}
