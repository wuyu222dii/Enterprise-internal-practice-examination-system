package com.examsystem.modules.organization.dto;

public record UpdateEmployeeRequest(
        String displayName,
        String departmentPath,
        String phone,
        String status
) {
}
