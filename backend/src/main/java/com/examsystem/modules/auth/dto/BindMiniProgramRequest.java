package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record BindMiniProgramRequest(
        @NotBlank String verificationToken,
        @NotBlank String miniProgramOpenId
) {
}
