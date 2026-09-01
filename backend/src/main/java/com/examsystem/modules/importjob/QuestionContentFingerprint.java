package com.examsystem.modules.importjob;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Duplicate/conflict key: bank + normalized type + stem + ordered options.
 * Answer fingerprint is compared separately (same → duplicate, different → conflict).
 */
final class QuestionContentFingerprint {

    private QuestionContentFingerprint() {
    }

    static String contentKey(String type, String stem, List<Map<String, Object>> options) {
        StringBuilder builder = new StringBuilder();
        builder.append(normalize(type)).append('\u0001');
        builder.append(normalize(stem)).append('\u0001');
        if (options != null) {
            for (Map<String, Object> option : options) {
                builder.append(normalize(String.valueOf(option.get("key")))).append(':');
                builder.append(normalize(String.valueOf(option.get("text")))).append('|');
            }
        }
        return builder.toString();
    }

    static String answerKey(List<String> answers) {
        if (answers == null || answers.isEmpty()) {
            return "";
        }
        List<String> normalized = new ArrayList<>(answers.size());
        for (String answer : answers) {
            normalized.add(normalize(answer));
        }
        normalized.sort(Comparator.naturalOrder());
        return String.join("\u0001", normalized);
    }

    static String stemSummary(String stem) {
        String normalized = stem == null ? "" : stem.replace('\u3000', ' ').trim();
        return normalized.length() <= 80 ? normalized : normalized.substring(0, 80);
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('\u3000', ' ')
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
