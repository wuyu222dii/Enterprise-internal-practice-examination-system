package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SmsVerifyRequest(
        @NotBlank String phone,
        @NotBlank String code,
        @NotBlank String purpose
) {
}
