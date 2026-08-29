package com.examsystem.modules.organization.dto;

import java.util.List;

public record PagedEmployeesDto(
        List<EmployeeSummaryDto> items,
        long total,
        int page,
        int pageSize
) {
}
