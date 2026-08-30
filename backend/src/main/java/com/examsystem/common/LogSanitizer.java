package com.examsystem.common;

import java.util.LinkedHashMap;
import java.util.Map;

public final class LogSanitizer {

    private LogSanitizer() {
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    public static Object redact(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            return value;
        }
        Map<String, Object> copy = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            String key = String.valueOf(entry.getKey());
            String lower = key.toLowerCase();
            if (lower.contains("password")
                    || lower.contains("token")
                    || lower.contains("secret")
                    || lower.contains("code")
                    || lower.contains("openid")) {
                copy.put(key, "***");
            } else if (lower.contains("phone")) {
                copy.put(key, maskPhone(String.valueOf(entry.getValue())));
            } else {
                copy.put(key, redact(entry.getValue()));
            }
        }
        return copy;
    }
}
