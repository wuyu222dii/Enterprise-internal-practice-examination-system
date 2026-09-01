package com.examsystem.common;

import java.security.SecureRandom;
import java.util.Locale;

/**
 * Requirement §17.4: 8–64 characters, at least three of four character classes
 * (upper, lower, digit, special), and must not contain employee number or phone.
 */
public final class PasswordPolicy {

    public static final String HINT =
            "密码须为 8–64 位，大写、小写、数字、特殊符号四类中至少三类，且不得包含工号或手机号";

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnpqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$";
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordPolicy() {
    }

    public static void validate(String password, String employeeNo, String phone) {
        if (password == null || password.length() < 8 || password.length() > 64) {
            throw BusinessException.of(ErrorCode.AUTH_PASSWORD_POLICY_VIOLATION, HINT, 422);
        }
        int classes = 0;
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (c >= 'A' && c <= 'Z') {
                hasUpper = true;
            } else if (c >= 'a' && c <= 'z') {
                hasLower = true;
            } else if (c >= '0' && c <= '9') {
                hasDigit = true;
            } else {
                hasSpecial = true;
            }
        }
        if (hasUpper) {
            classes++;
        }
        if (hasLower) {
            classes++;
        }
        if (hasDigit) {
            classes++;
        }
        if (hasSpecial) {
            classes++;
        }
        if (classes < 3) {
            throw BusinessException.of(ErrorCode.AUTH_PASSWORD_POLICY_VIOLATION, HINT, 422);
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (employeeNo != null && !employeeNo.isBlank()
                && lower.contains(employeeNo.trim().toLowerCase(Locale.ROOT))) {
            throw BusinessException.of(ErrorCode.AUTH_PASSWORD_POLICY_VIOLATION, "密码不得包含工号", 422);
        }
        if (phone != null && !phone.isBlank() && password.contains(phone.trim())) {
            throw BusinessException.of(ErrorCode.AUTH_PASSWORD_POLICY_VIOLATION, "密码不得包含手机号", 422);
        }
    }

    public static String generateTemporary() {
        char[] chars = new char[12];
        chars[0] = UPPER.charAt(RANDOM.nextInt(UPPER.length()));
        chars[1] = LOWER.charAt(RANDOM.nextInt(LOWER.length()));
        chars[2] = DIGITS.charAt(RANDOM.nextInt(DIGITS.length()));
        chars[3] = SPECIAL.charAt(RANDOM.nextInt(SPECIAL.length()));
        String all = UPPER + LOWER + DIGITS + SPECIAL;
        for (int i = 4; i < chars.length; i++) {
            chars[i] = all.charAt(RANDOM.nextInt(all.length()));
        }
        for (int i = chars.length - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
        return new String(chars);
    }
}
