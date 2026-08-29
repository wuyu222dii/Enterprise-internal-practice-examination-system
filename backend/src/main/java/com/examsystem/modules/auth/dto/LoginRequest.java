package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String employeeNo,
        @NotBlank String password,
        @NotBlank String clientType
) {
}
