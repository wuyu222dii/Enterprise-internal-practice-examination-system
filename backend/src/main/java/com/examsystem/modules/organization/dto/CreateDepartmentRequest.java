package com.examsystem.modules.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateDepartmentRequest(
        @NotBlank String name,
        @NotBlank String parentId
) {
}
