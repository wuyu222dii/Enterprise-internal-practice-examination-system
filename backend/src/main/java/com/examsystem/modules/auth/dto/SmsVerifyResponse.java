package com.examsystem.modules.auth.dto;

import java.time.Instant;

public record SmsVerifyResponse(String verificationToken, Instant expiresAt) {
}
