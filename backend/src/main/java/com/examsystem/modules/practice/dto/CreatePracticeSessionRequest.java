package com.examsystem.modules.practice.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePracticeSessionRequest(
        @NotBlank String questionBankId,
        @NotBlank String mode,
        Scope scope,
        Integer questionCount
) {
    public record Scope(String categoryId, String knowledgePointId) {
    }
}
