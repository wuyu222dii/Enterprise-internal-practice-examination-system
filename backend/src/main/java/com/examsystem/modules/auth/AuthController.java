package com.examsystem.modules.auth;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.modules.auth.dto.ChangePasswordRequest;
import com.examsystem.modules.auth.dto.LoginRequest;
import com.examsystem.modules.auth.dto.LoginResponse;
import com.examsystem.modules.auth.dto.SessionResponse;
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
}
