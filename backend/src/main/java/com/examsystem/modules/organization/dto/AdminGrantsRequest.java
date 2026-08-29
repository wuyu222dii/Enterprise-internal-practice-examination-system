package com.examsystem.modules.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminGrantsRequest(
        Boolean isAdmin,
        Boolean hasOutageDisposition,
        @NotBlank String reason
) {
}
