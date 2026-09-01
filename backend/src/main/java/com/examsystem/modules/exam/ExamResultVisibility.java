package com.examsystem.modules.exam;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * VIS-01 / AD-11 result disclosure flags derived from published {@code resultPolicy}.
 */
final class ExamResultVisibility {

    private ExamResultVisibility() {
    }

    static Map<String, Object> flags(
            Map<String, Object> resultPolicy,
            boolean submittedAndAvailable,
            String lifecycle
    ) {
        Map<String, Object> policy = resultPolicy == null ? Map.of() : resultPolicy;
        String revealTiming = stringVal(policy.get("revealTiming"), "afterSubmit");
        boolean timingOk = !"afterExamEnd".equals(revealTiming) || "ended".equals(lifecycle);
        boolean summaryVisible = submittedAndAvailable && timingOk;
        boolean answersAllowed = summaryVisible && resolveAnswersAllowed(policy);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("summaryVisible", summaryVisible);
        map.put("revealTiming", revealTiming);
        map.put("showScore", summaryVisible && boolVal(policy.get("showScore"), true));
        map.put("passingScoreVisible", summaryVisible && boolVal(policy.get("passingScoreVisible"), false));
        map.put("passConclusionVisible", summaryVisible && firstBool(policy, "showPassConclusion", "passConclusionVisible"));
        map.put("showCorrectCount", summaryVisible && boolVal(policy.get("showCorrectCount"), false));
        map.put("showWrongCount", summaryVisible && boolVal(policy.get("showWrongCount"), false));
        map.put("perItemReviewAllowed", answersAllowed);
        map.put("showExplanation", summaryVisible && boolVal(policy.get("showExplanation"), answersAllowed));
        return map;
    }

    static boolean flag(Map<String, Object> visibility, String key) {
        return Boolean.TRUE.equals(visibility.get(key));
    }

    private static boolean resolveAnswersAllowed(Map<String, Object> policy) {
        if (policy.containsKey("perItemReviewAllowed")) {
            return boolVal(policy.get("perItemReviewAllowed"), false);
        }
        if (policy.containsKey("showAnswers")) {
            return boolVal(policy.get("showAnswers"), false);
        }
        return false;
    }

    private static boolean firstBool(Map<String, Object> policy, String primary, String alias) {
        if (policy.containsKey(primary)) {
            return boolVal(policy.get(primary), false);
        }
        return boolVal(policy.get(alias), false);
    }

    private static boolean boolVal(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private static String stringVal(Object value, String defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() || "null".equals(text) ? defaultValue : text;
    }
}
