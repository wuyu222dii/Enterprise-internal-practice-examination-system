package com.examsystem.modules.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Service
@Profile("!test")
public class SessionService {

    private static final String SESSION_KEY_PREFIX = "session:";
    private static final String EMPLOYEE_SESSIONS_PREFIX = "employee:sessions:";

    private final RedisTemplate<String, String> redisTemplate;
    private final Duration sessionTtl;

    public SessionService(
            RedisTemplate<String, String> redisTemplate,
            @Value("${exam.security.session-ttl-hours:24}") int sessionTtlHours
    ) {
        this.redisTemplate = redisTemplate;
        this.sessionTtl = Duration.ofHours(sessionTtlHours);
    }

    public void storeSession(String token, String employeeId) {
        redisTemplate.opsForValue().set(sessionKey(token), employeeId, sessionTtl);
        redisTemplate.opsForSet().add(employeeSessionsKey(employeeId), token);
        redisTemplate.expire(employeeSessionsKey(employeeId), sessionTtl);
    }

    public Optional<String> getEmployeeId(String token) {
        String employeeId = redisTemplate.opsForValue().get(sessionKey(token));
        return Optional.ofNullable(employeeId);
    }

    public void invalidateSession(String token) {
        Optional<String> employeeId = getEmployeeId(token);
        redisTemplate.delete(sessionKey(token));
        employeeId.ifPresent(id -> redisTemplate.opsForSet().remove(employeeSessionsKey(id), token));
    }

    public void invalidateOtherSessions(String employeeId, String currentToken) {
        Set<String> tokens = redisTemplate.opsForSet().members(employeeSessionsKey(employeeId));
        if (tokens == null) {
            return;
        }
        for (String token : tokens) {
            if (!token.equals(currentToken)) {
                invalidateSession(token);
            }
        }
    }

    public void invalidateAllSessions(String employeeId) {
        Set<String> tokens = redisTemplate.opsForSet().members(employeeSessionsKey(employeeId));
        if (tokens != null) {
            for (String token : tokens) {
                redisTemplate.delete(sessionKey(token));
            }
        }
        redisTemplate.delete(employeeSessionsKey(employeeId));
    }

    private String sessionKey(String token) {
        return SESSION_KEY_PREFIX + token;
    }

    private String employeeSessionsKey(String employeeId) {
        return EMPLOYEE_SESSIONS_PREFIX + employeeId;
    }
}
