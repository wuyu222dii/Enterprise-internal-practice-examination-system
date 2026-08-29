package com.examsystem.modules.auth;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.modules.auth.dto.ChangePasswordRequest;
import com.examsystem.modules.auth.dto.LoginRequest;
import com.examsystem.modules.auth.dto.LoginResponse;
import com.examsystem.modules.auth.dto.SessionDto;
import com.examsystem.modules.organization.entity.Employee;
import com.examsystem.modules.organization.repository.EmployeeRepository;
import com.examsystem.security.EmployeePrincipal;
import com.examsystem.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class AuthService {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private final EmployeeRepository employeeRepository;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;
    private final int maxFailedAttempts;
    private final int lockDurationMinutes;

    public AuthService(
            EmployeeRepository employeeRepository,
            SessionService sessionService,
            PasswordEncoder passwordEncoder,
            @Value("${exam.security.max-failed-attempts:5}") int maxFailedAttempts,
            @Value("${exam.security.lock-duration-minutes:15}") int lockDurationMinutes
    ) {
        this.employeeRepository = employeeRepository;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.maxFailedAttempts = maxFailedAttempts;
        this.lockDurationMinutes = lockDurationMinutes;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Employee employee = employeeRepository.findByEmployeeNo(request.employeeNo())
                .orElseThrow(() -> BusinessException.of(
                        ErrorCode.AUTH_INVALID_CREDENTIALS, "工号或密码错误", 401));

        if (!"active".equals(employee.getStatus())) {
            throw BusinessException.of(ErrorCode.AUTH_ACCOUNT_DISABLED, "账号已停用", 403);
        }
        if (employee.getLockedUntil() != null && employee.getLockedUntil().isAfter(Instant.now())) {
            throw BusinessException.of(ErrorCode.AUTH_ACCOUNT_LOCKED, "账号已锁定", 403);
        }
        if (!passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            registerFailedLogin(employee);
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "工号或密码错误", 401);
        }

        employee.setFailedLoginCount(0);
        employee.setLockedUntil(null);
        employeeRepository.save(employee);

        String token = IdGenerator.newId("sess");
        sessionService.storeSession(token, employee.getId());
        SessionDto session = toSessionDto(employee);
        return new LoginResponse(session, token);
    }

    public SessionDto getCurrentSession() {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal == null) {
            throw BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401);
        }
        Employee employee = employeeRepository.findById(principal.getEmployeeId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401));
        return toSessionDto(employee);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal == null) {
            throw BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401);
        }
        Employee employee = employeeRepository.findById(principal.getEmployeeId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401));

        if (!passwordEncoder.matches(request.currentPassword(), employee.getPasswordHash())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "当前密码错误", 401);
        }
        validatePasswordPolicy(request.newPassword());

        employee.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        employee.setMustChangePassword(false);
        employee.setFailedLoginCount(0);
        employee.setLockedUntil(null);
        employeeRepository.save(employee);

        sessionService.invalidateOtherSessions(employee.getId(), principal.getSessionToken());
    }

    public void logout() {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal != null && principal.getSessionToken() != null) {
            sessionService.invalidateSession(principal.getSessionToken());
        }
    }

    private void registerFailedLogin(Employee employee) {
        int failedCount = employee.getFailedLoginCount() + 1;
        employee.setFailedLoginCount(failedCount);
        if (failedCount >= maxFailedAttempts) {
            employee.setLockedUntil(Instant.now().plus(lockDurationMinutes, ChronoUnit.MINUTES));
        }
        employeeRepository.save(employee);
        if (employee.getLockedUntil() != null && employee.getLockedUntil().isAfter(Instant.now())) {
            throw BusinessException.of(ErrorCode.AUTH_ACCOUNT_LOCKED, "账号已锁定", 403);
        }
    }

    private void validatePasswordPolicy(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw BusinessException.of(
                    ErrorCode.AUTH_PASSWORD_POLICY_VIOLATION,
                    "密码长度至少为 " + MIN_PASSWORD_LENGTH + " 位",
                    422
            );
        }
    }

    private SessionDto toSessionDto(Employee employee) {
        List<String> roles = new ArrayList<>();
        roles.add("employee");
        if (employee.isAdmin()) {
            roles.add("admin");
        }
        if (employee.isHasOutageDisposition()) {
            roles.add("outageDisposition");
        }
        return new SessionDto(
                employee.getId(),
                employee.getEmployeeNo(),
                employee.getDisplayName(),
                roles,
                employee.isAdmin(),
                employee.isHasOutageDisposition(),
                employee.isMustChangePassword(),
                employee.getMiniProgramOpenId() != null && !employee.getMiniProgramOpenId().isBlank()
        );
    }
}
