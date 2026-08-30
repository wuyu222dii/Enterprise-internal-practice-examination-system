package com.examsystem.common;

/**
 * Prefix-escape Excel formula injection (SEC-04): values starting with {@code = + - @} become text.
 */
public final class ExcelCellHelper {

    private ExcelCellHelper() {
    }

    public static String sanitize(String value) {
        if (value == null || value.isEmpty()) {
            return value == null ? "" : value;
        }
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@') {
            return "'" + value;
        }
        return value;
    }
}
