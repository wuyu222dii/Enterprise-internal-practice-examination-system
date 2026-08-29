package com.examsystem.modules.mock.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMockAttemptRequest(
        @NotBlank String questionBankId,
        @NotNull Integer questionCount,
        @NotNull @Min(10) @Max(180) Integer durationMinutes
) {
}
