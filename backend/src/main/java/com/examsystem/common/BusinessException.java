package com.examsystem.common;

public class BusinessException extends RuntimeException {

    private final ErrorCode code;
    private final int httpStatus;

    public BusinessException(ErrorCode code, String message, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public ErrorCode getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public static BusinessException of(ErrorCode code, String message, int httpStatus) {
        return new BusinessException(code, message, httpStatus);
    }
}
