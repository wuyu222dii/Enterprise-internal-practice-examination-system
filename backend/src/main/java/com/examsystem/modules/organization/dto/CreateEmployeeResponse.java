package com.examsystem.modules.organization.dto;

public record CreateEmployeeResponse(
        EmployeeSummaryDto employee,
        String temporaryPassword,
        String credentialBatchId
) {
}
