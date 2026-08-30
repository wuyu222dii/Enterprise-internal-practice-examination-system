package com.examsystem.modules.organization.dto;

import java.util.List;
import java.util.Map;

public record EmployeeImportResponse(
        String batchId,
        int importedCount,
        int skippedCount,
        List<Map<String, Object>> skippedRows,
        String credentialBatchId
) {
}
