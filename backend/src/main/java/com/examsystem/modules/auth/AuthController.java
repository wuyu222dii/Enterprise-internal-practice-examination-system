package com.examsystem.modules.auth;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.modules.auth.dto.BindMiniProgramRequest;
import com.examsystem.modules.auth.dto.ChangePasswordRequest;
import com.examsystem.modules.auth.dto.LoginRequest;
import com.examsystem.modules.auth.dto.LoginResponse;
import com.examsystem.modules.auth.dto.PasswordResetRequest;
import com.examsystem.modules.auth.dto.SessionResponse;
import com.examsystem.modules.auth.dto.SmsSendRequest;
import com.examsystem.modules.auth.dto.SmsVerifyRequest;
import com.examsystem.modules.auth.dto.SmsVerifyResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final MetaFactory metaFactory;

    public AuthController(AuthService authService, MetaFactory metaFactory) {
        this.authService = authService;
        this.metaFactory = metaFactory;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.ok(response, metaFactory.build());
    }

    @GetMapping("/session")
    public ApiResponse<SessionResponse> getSession() {
        SessionResponse response = new SessionResponse(authService.getCurrentSession());
        return ApiResponse.ok(response, metaFactory.build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        authService.logout();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ApiResponse<Object> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/sms/send")
    public ApiResponse<Object> sendSms(@Valid @RequestBody SmsSendRequest request) {
        authService.sendSms(request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/sms/verify")
    public ApiResponse<SmsVerifyResponse> verifySms(@Valid @RequestBody SmsVerifyRequest request) {
        return ApiResponse.ok(authService.verifySms(request), metaFactory.build());
    }

    @PostMapping("/password-reset")
    public ApiResponse<Object> passwordReset(@Valid @RequestBody PasswordResetRequest request) {
        authService.passwordReset(request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/mini-program/bind")
    public ApiResponse<Object> bindMiniProgram(@Valid @RequestBody BindMiniProgramRequest request) {
        authService.bindMiniProgram(request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }
}
