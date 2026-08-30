package com.examsystem.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ResolveOpenIdRequest(@NotBlank String code) {
}
