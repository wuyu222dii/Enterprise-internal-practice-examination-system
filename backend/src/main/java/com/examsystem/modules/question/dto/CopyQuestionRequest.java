package com.examsystem.modules.question.dto;

import jakarta.validation.constraints.NotBlank;

public record CopyQuestionRequest(
        @NotBlank String targetBankId,
        @NotBlank String categoryId,
        String knowledgePointId
) {
}
