package com.examsystem.modules.auth;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.auth.dto.BindMiniProgramRequest;
import com.examsystem.modules.auth.dto.ChangePasswordRequest;
import com.examsystem.modules.auth.dto.LoginRequest;
import com.examsystem.modules.auth.dto.LoginResponse;
import com.examsystem.modules.auth.dto.PasswordResetRequest;
import com.examsystem.modules.auth.dto.ResolveOpenIdRequest;
import com.examsystem.modules.auth.dto.SessionDto;
import com.examsystem.modules.auth.dto.SmsSendRequest;
import com.examsystem.modules.auth.dto.SmsVerifyRequest;
import com.examsystem.modules.auth.dto.SmsVerifyResponse;
import com.examsystem.modules.auth.dto.UnbindMiniProgramRequest;
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
import java.util.Map;

@Service
public class AuthService {

    private static final int MIN_PASSWORD_LENGTH = 8;

    private final EmployeeRepository employeeRepository;
    private final SessionService sessionService;
    private final SmsVerificationService smsVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final WechatOpenIdResolver wechatOpenIdResolver;
    private final int maxFailedAttempts;
    private final int lockDurationMinutes;

    public AuthService(
            EmployeeRepository employeeRepository,
            SessionService sessionService,
            SmsVerificationService smsVerificationService,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            WechatOpenIdResolver wechatOpenIdResolver,
            @Value("${exam.security.max-failed-attempts:5}") int maxFailedAttempts,
            @Value("${exam.security.lock-duration-minutes:15}") int lockDurationMinutes
    ) {
        this.employeeRepository = employeeRepository;
        this.sessionService = sessionService;
        this.smsVerificationService = smsVerificationService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.wechatOpenIdResolver = wechatOpenIdResolver;
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

    public void sendSms(SmsSendRequest request) {
        if ("bindMiniProgram".equals(request.purpose()) || "unbindMiniProgram".equals(request.purpose())) {
            assertArchivePhoneMatches(request.phone());
        }
        smsVerificationService.sendCode(request.phone(), request.purpose());
    }

    public SmsVerifyResponse verifySms(SmsVerifyRequest request) {
        SmsVerificationService.VerificationResult result = smsVerificationService.verifyCode(
                request.phone(), request.code(), request.purpose());
        return new SmsVerifyResponse(result.verificationToken(), result.expiresAt());
    }

    @Transactional
    public void passwordReset(PasswordResetRequest request) {
        SmsVerificationService.VerificationResult verification =
                smsVerificationService.consumeVerificationToken(request.verificationToken());
        if (!"resetPassword".equals(verification.purpose())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证令牌用途不匹配", 401);
        }

        Employee employee = employeeRepository.findByEmployeeNo(request.employeeNo())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "员工不存在", 404));
        if (employee.getPhone() == null || !employee.getPhone().equals(verification.phone())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "手机号与工号不匹配", 401);
        }

        validatePasswordPolicy(request.newPassword());
        employee.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        employee.setMustChangePassword(false);
        employee.setFailedLoginCount(0);
        employee.setLockedUntil(null);
        employeeRepository.save(employee);
        sessionService.invalidateAllSessions(employee.getId());
    }

    @Transactional
    public void bindMiniProgram(BindMiniProgramRequest request) {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal == null) {
            throw BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401);
        }

        SmsVerificationService.VerificationResult verification =
                smsVerificationService.consumeVerificationToken(request.verificationToken());
        if (!"bindMiniProgram".equals(verification.purpose())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证令牌用途不匹配", 401);
        }

        Employee employee = employeeRepository.findById(principal.getEmployeeId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401));
        if (employee.getPhone() == null || !employee.getPhone().equals(verification.phone())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "手机号不匹配", 401);
        }

        employeeRepository.findByMiniProgramOpenId(request.miniProgramOpenId())
                .filter(existing -> !existing.getId().equals(employee.getId()))
                .ifPresent(existing -> {
                    throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "该微信已绑定其他账号", 422);
                });

        String beforeOpenId = employee.getMiniProgramOpenId();
        employee.setMiniProgramOpenId(request.miniProgramOpenId());
        employeeRepository.save(employee);

        auditService.log(
                "miniProgram.bind",
                "Employee",
                employee.getId(),
                Map.of("miniProgramOpenId", beforeOpenId == null ? "" : beforeOpenId),
                Map.of("miniProgramOpenId", request.miniProgramOpenId()),
                null
        );
    }

    @Transactional
    public void unbindMiniProgram(UnbindMiniProgramRequest request) {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal == null) {
            throw BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401);
        }

        SmsVerificationService.VerificationResult verification =
                smsVerificationService.consumeVerificationToken(request.verificationToken());
        if (!"unbindMiniProgram".equals(verification.purpose())
                && !"bindMiniProgram".equals(verification.purpose())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证令牌用途不匹配", 401);
        }

        Employee employee = employeeRepository.findById(principal.getEmployeeId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401));
        if (employee.getPhone() == null || !employee.getPhone().equals(verification.phone())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "手机号不匹配", 401);
        }
        if (employee.getMiniProgramOpenId() == null || employee.getMiniProgramOpenId().isBlank()) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "当前账号未绑定微信", 422);
        }

        String beforeOpenId = employee.getMiniProgramOpenId();
        employee.setMiniProgramOpenId(null);
        employeeRepository.save(employee);
        auditService.log(
                "miniProgram.unbind",
                "Employee",
                employee.getId(),
                Map.of("miniProgramOpenId", beforeOpenId),
                Map.of("miniProgramOpenId", ""),
                null
        );
    }

    public Map<String, Object> resolveOpenId(ResolveOpenIdRequest request) {
        SecurityUtils.requirePrincipal();
        return Map.of("openId", wechatOpenIdResolver.resolve(request.code()));
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
                employee.getMiniProgramOpenId() != null && !employee.getMiniProgramOpenId().isBlank(),
                maskPhone(employee.getPhone())
        );
    }

    private void assertArchivePhoneMatches(String phone) {
        EmployeePrincipal principal = SecurityUtils.getCurrentPrincipal();
        if (principal == null) {
            throw BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401);
        }
        Employee employee = employeeRepository.findById(principal.getEmployeeId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.AUTH_SESSION_EXPIRED, "会话已过期", 401));
        if (employee.getPhone() == null || employee.getPhone().isBlank()) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "档案未登记手机号，请联系管理员维护后再绑定", 422);
        }
        if (!employee.getPhone().equals(phone)) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "手机号不匹配", 401);
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return null;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
