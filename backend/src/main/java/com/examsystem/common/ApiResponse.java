package com.examsystem.common;

public record ApiResponse<T>(T data, ResponseMeta meta) {

    public static <T> ApiResponse<T> ok(T data, ResponseMeta meta) {
        return new ApiResponse<>(data, meta);
    }
}
