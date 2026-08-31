package com.examsystem.modules.auth.dto;

import java.util.List;

public record SessionDto(
        String employeeId,
        String employeeNo,
        String displayName,
        List<String> roles,
        boolean isAdmin,
        boolean hasOutageDisposition,
        boolean mustChangePassword,
        boolean miniProgramBound,
        String phoneMasked
) {
}
