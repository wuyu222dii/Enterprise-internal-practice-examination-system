package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SmsSendRequest(
        @NotBlank String phone,
        @NotBlank String purpose
) {
}
