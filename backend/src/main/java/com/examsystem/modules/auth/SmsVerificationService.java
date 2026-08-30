package com.examsystem.modules.auth;

import java.time.Instant;

public interface SmsVerificationService {

    void sendCode(String phone, String purpose);

    VerificationResult verifyCode(String phone, String code, String purpose);

    VerificationResult consumeVerificationToken(String token);

    record VerificationResult(String verificationToken, Instant expiresAt, String phone, String purpose) {
    }
}
