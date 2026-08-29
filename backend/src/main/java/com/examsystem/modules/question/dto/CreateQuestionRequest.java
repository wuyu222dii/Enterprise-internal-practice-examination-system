package com.examsystem.modules.question.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateQuestionRequest(
        @NotBlank String categoryId,
        String knowledgePointId,
        QuestionVersionInput version
) {
}
