package com.examsystem.modules.organization.dto;

public record EmployeeSummaryDto(
        String id,
        String employeeNo,
        String displayName,
        String departmentPath,
        String phoneMasked,
        String status,
        boolean isAdmin,
        boolean hasOutageDisposition
) {
}
