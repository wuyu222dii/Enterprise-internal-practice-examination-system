package com.examsystem.modules.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateEmployeeRequest(
        @NotBlank String employeeNo,
        @NotBlank String displayName,
        @NotBlank String departmentPath,
        String phone
) {
}
