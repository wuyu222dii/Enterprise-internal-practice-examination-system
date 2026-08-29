package com.examsystem.security;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.modules.auth.SessionService;
import com.examsystem.modules.organization.entity.Employee;
import com.examsystem.modules.organization.repository.EmployeeRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;

@Component
public class TokenAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final SessionService sessionService;
    private final EmployeeRepository employeeRepository;

    public TokenAuthenticationFilter(SessionService sessionService, EmployeeRepository employeeRepository) {
        this.sessionService = sessionService;
        this.employeeRepository = employeeRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = extractToken(request);
        if (token != null) {
            authenticateToken(token, request);
        }
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            enforceAccountAndPasswordPolicy(request);
        }
        filterChain.doFilter(request, response);
    }

    private void authenticateToken(String token, HttpServletRequest request) {
        Optional<String> employeeIdOpt = sessionService.getEmployeeId(token);
        if (employeeIdOpt.isEmpty()) {
            return;
        }
        employeeRepository.findById(employeeIdOpt.get()).ifPresent(employee -> {
            if (!isAccountAccessible(employee)) {
                return;
            }
            EmployeePrincipal principal = new EmployeePrincipal(
                    employee.getId(),
                    employee.getEmployeeNo(),
                    employee.getDisplayName(),
                    employee.isAdmin(),
                    employee.isHasOutageDisposition(),
                    employee.isMustChangePassword(),
                    "active".equals(employee.getStatus()),
                    token
            );
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    principal.getAuthorities()
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        });
    }

    private void enforceAccountAndPasswordPolicy(HttpServletRequest request) {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal == null) {
            return;
        }
        if (!principal.isEnabled()) {
            throw BusinessException.of(ErrorCode.AUTH_ACCOUNT_DISABLED, "账号已停用", 403);
        }
        employeeRepository.findById(principal.getEmployeeId()).ifPresent(employee -> {
            if (employee.getLockedUntil() != null && employee.getLockedUntil().isAfter(Instant.now())) {
                throw BusinessException.of(ErrorCode.AUTH_ACCOUNT_LOCKED, "账号已锁定", 403);
            }
        });
        if (principal.isMustChangePassword() && !isPasswordChangeAllowed(request)) {
            throw BusinessException.of(ErrorCode.AUTH_PASSWORD_CHANGE_REQUIRED, "请先修改密码", 403);
        }
    }

    private boolean isAccountAccessible(Employee employee) {
        if (!"active".equals(employee.getStatus())) {
            return false;
        }
        if (employee.getLockedUntil() != null && employee.getLockedUntil().isAfter(Instant.now())) {
            return false;
        }
        return true;
    }

    private boolean isPasswordChangeAllowed(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return "/auth/change-password".equals(path) || "/auth/session".equals(path);
    }

    private String extractToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith(BEARER_PREFIX)) {
            return authorization.substring(BEARER_PREFIX.length()).trim();
        }
        return null;
    }
}
