package com.examsystem.modules.question.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record QuestionVersionInput(
        @NotBlank String type,
        @NotBlank String stem,
        List<Map<String, Object>> options,
        @NotEmpty List<String> standardAnswer,
        String explanation,
        String difficulty,
        BigDecimal defaultScore
) {
}
