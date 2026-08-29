package com.examsystem.modules.auth.dto;

public record LoginResponse(SessionDto session, String token) {
}
