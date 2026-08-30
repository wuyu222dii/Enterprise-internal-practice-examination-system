package com.examsystem.modules.auth;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Profile("test")
public class InMemorySmsVerificationService implements SmsVerificationService {

    private static final Logger log = LoggerFactory.getLogger(InMemorySmsVerificationService.class);
    private static final int CODE_TTL_MINUTES = 5;
    private static final int TOKEN_TTL_MINUTES = 10;

    private final Map<String, CodeEntry> codes = new ConcurrentHashMap<>();
    private final Map<String, TokenEntry> tokens = new ConcurrentHashMap<>();

    @Override
    public void sendCode(String phone, String purpose) {
        String code = "123456";
        codes.put(key(phone, purpose), new CodeEntry(code, Instant.now().plus(CODE_TTL_MINUTES, ChronoUnit.MINUTES)));
        log.info("[SMS Mock] phone={} purpose={} code={}", phone, purpose, code);
    }

    @Override
    public VerificationResult verifyCode(String phone, String code, String purpose) {
        CodeEntry entry = codes.get(key(phone, purpose));
        if (entry == null || entry.expiresAt.isBefore(Instant.now()) || !entry.code.equals(code)) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证码无效或已过期", 401);
        }
        codes.remove(key(phone, purpose));
        String token = IdGenerator.newId("vrf");
        Instant expiresAt = Instant.now().plus(TOKEN_TTL_MINUTES, ChronoUnit.MINUTES);
        tokens.put(token, new TokenEntry(phone, purpose, expiresAt));
        return new VerificationResult(token, expiresAt, phone, purpose);
    }

    @Override
    public VerificationResult consumeVerificationToken(String token) {
        TokenEntry entry = tokens.remove(token);
        if (entry == null || entry.expiresAt.isBefore(Instant.now())) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证令牌无效或已过期", 401);
        }
        return new VerificationResult(token, entry.expiresAt, entry.phone, entry.purpose);
    }

    private String key(String phone, String purpose) {
        return phone + ":" + purpose;
    }

    private record CodeEntry(String code, Instant expiresAt) {
    }

    private record TokenEntry(String phone, String purpose, Instant expiresAt) {
    }
}
