package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequest(
        @NotBlank String employeeNo,
        @NotBlank String verificationToken,
        @NotBlank String newPassword
) {
}
