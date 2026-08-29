package com.examsystem.security;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static String getCurrentEmployeeId() {
        EmployeePrincipal principal = getCurrentPrincipal();
        return principal != null ? principal.getEmployeeId() : null;
    }

    public static EmployeePrincipal getCurrentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof EmployeePrincipal principal)) {
            return null;
        }
        return principal;
    }

    public static EmployeePrincipal requirePrincipal() {
        EmployeePrincipal principal = getCurrentPrincipal();
        if (principal == null) {
            throw BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401);
        }
        return principal;
    }

    public static void requireAdmin() {
        EmployeePrincipal principal = requirePrincipal();
        if (!principal.isAdmin()) {
            throw BusinessException.of(ErrorCode.SEC_FORBIDDEN, "需要管理员权限", 403);
        }
    }

    public static void requireOwnerOrAdmin(String ownerEmployeeId) {
        EmployeePrincipal principal = requirePrincipal();
        if (!principal.isAdmin() && !principal.getEmployeeId().equals(ownerEmployeeId)) {
            throw BusinessException.of(ErrorCode.SEC_FORBIDDEN, "无权访问该资源", 403);
        }
    }
}
