package com.examsystem.modules.exam.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public record SaveAnswerRequest(
        @NotEmpty List<String> answer,
        @NotNull @Min(1) Integer answerVersion
) {
}
