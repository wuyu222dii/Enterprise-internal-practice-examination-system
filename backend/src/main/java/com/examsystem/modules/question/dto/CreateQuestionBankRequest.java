package com.examsystem.modules.question.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record CreateQuestionBankRequest(
        @NotBlank String name,
        Boolean practiceEnabled,
        Boolean mockEnabled
) {
}
