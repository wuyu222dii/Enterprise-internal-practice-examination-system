package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record UnbindMiniProgramRequest(@NotBlank String verificationToken) {
}
