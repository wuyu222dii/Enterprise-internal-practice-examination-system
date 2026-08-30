package com.examsystem.modules.auth;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Profile("!test")
public class RedisSmsVerificationService implements SmsVerificationService {

    private static final Logger log = LoggerFactory.getLogger(RedisSmsVerificationService.class);
    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration TOKEN_TTL = Duration.ofMinutes(10);
    private static final Duration RATE_LIMIT = Duration.ofMinutes(1);

    private final RedisTemplate<String, String> redisTemplate;

    public RedisSmsVerificationService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void sendCode(String phone, String purpose) {
        String rateKey = "sms:rate:" + phone;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(rateKey))) {
            throw BusinessException.of(ErrorCode.AUTH_SMS_RATE_LIMITED, "发送过于频繁，请稍后再试", 429);
        }
        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
        redisTemplate.opsForValue().set(codeKey(phone, purpose), code, CODE_TTL);
        redisTemplate.opsForValue().set(rateKey, "1", RATE_LIMIT);
        log.info("[SMS Mock] phone={} purpose={} code={}", phone, purpose, code);
    }

    @Override
    public VerificationResult verifyCode(String phone, String code, String purpose) {
        String stored = redisTemplate.opsForValue().get(codeKey(phone, purpose));
        if (stored == null || !stored.equals(code)) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证码无效或已过期", 401);
        }
        redisTemplate.delete(codeKey(phone, purpose));
        String token = IdGenerator.newId("vrf");
        Instant expiresAt = Instant.now().plus(TOKEN_TTL);
        redisTemplate.opsForValue().set(
                tokenKey(token),
                phone + "|" + purpose,
                TOKEN_TTL
        );
        return new VerificationResult(token, expiresAt, phone, purpose);
    }

    @Override
    public VerificationResult consumeVerificationToken(String token) {
        String value = redisTemplate.opsForValue().get(tokenKey(token));
        if (value == null) {
            throw BusinessException.of(ErrorCode.AUTH_INVALID_CREDENTIALS, "验证令牌无效或已过期", 401);
        }
        redisTemplate.delete(tokenKey(token));
        String[] parts = value.split("\\|", 2);
        return new VerificationResult(token, Instant.now().plus(TOKEN_TTL.toMinutes(), ChronoUnit.MINUTES),
                parts[0], parts.length > 1 ? parts[1] : "");
    }

    private String codeKey(String phone, String purpose) {
        return "sms:code:" + phone + ":" + purpose;
    }

    private String tokenKey(String token) {
        return "sms:token:" + token;
    }
}
