package com.examsystem.modules.auth;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Profile("test")
public class InMemorySessionService extends SessionService {

    private final Map<String, String> sessions = new ConcurrentHashMap<>();
    private final Map<String, java.util.Set<String>> employeeSessions = new ConcurrentHashMap<>();

    public InMemorySessionService() {
        super(null, 1);
    }

    @Override
    public void storeSession(String token, String employeeId) {
        sessions.put(token, employeeId);
        employeeSessions.computeIfAbsent(employeeId, k -> ConcurrentHashMap.newKeySet()).add(token);
    }

    @Override
    public Optional<String> getEmployeeId(String token) {
        return Optional.ofNullable(sessions.get(token));
    }

    @Override
    public void invalidateSession(String token) {
        Optional<String> employeeId = getEmployeeId(token);
        sessions.remove(token);
        employeeId.ifPresent(id -> {
            java.util.Set<String> tokens = employeeSessions.get(id);
            if (tokens != null) {
                tokens.remove(token);
            }
        });
    }

    @Override
    public void invalidateOtherSessions(String employeeId, String currentToken) {
        java.util.Set<String> tokens = employeeSessions.get(employeeId);
        if (tokens == null) {
            return;
        }
        for (String token : java.util.Set.copyOf(tokens)) {
            if (!token.equals(currentToken)) {
                invalidateSession(token);
            }
        }
    }

    @Override
    public void invalidateAllSessions(String employeeId) {
        java.util.Set<String> tokens = employeeSessions.get(employeeId);
        if (tokens != null) {
            for (String token : java.util.Set.copyOf(tokens)) {
                sessions.remove(token);
            }
        }
        employeeSessions.remove(employeeId);
    }
}
