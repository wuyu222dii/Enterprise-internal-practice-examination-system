package com.examsystem.common;

public record ErrorResponse(ApiError error, ResponseMeta meta) {
}
