package com.examsystem.modules.organization.dto;

import java.util.List;

public record DepartmentDto(
        String id,
        String name,
        String parentId,
        String path,
        String status,
        long employeeCount,
        List<DepartmentDto> children
) {
}
