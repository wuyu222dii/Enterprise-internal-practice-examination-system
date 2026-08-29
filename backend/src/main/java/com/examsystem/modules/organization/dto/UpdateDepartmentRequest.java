package com.examsystem.modules.organization.dto;

public record UpdateDepartmentRequest(
        String name,
        String parentId,
        String status
) {
}
