package com.examsystem.modules.importjob;

import com.examsystem.common.JsonHelper;
import com.examsystem.modules.question.entity.QuestionVersion;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class QuestionImportDeduper {

    private QuestionImportDeduper() {
    }

    static void apply(Map<String, Object> preview, List<QuestionVersion> bankVersions) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> validRows = new ArrayList<>(
                (List<Map<String, Object>>) preview.getOrDefault("validRows", List.of()));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> errorRows = new ArrayList<>(
                (List<Map<String, Object>>) preview.getOrDefault("errorRows", List.of()));

        Map<String, String> bankAnswers = new HashMap<>();
        if (bankVersions != null) {
            for (QuestionVersion version : bankVersions) {
                String key = QuestionContentFingerprint.contentKey(
                        version.getType(),
                        version.getStem(),
                        JsonHelper.toMapList(version.getOptionsJson())
                );
                bankAnswers.put(key, QuestionContentFingerprint.answerKey(
                        JsonHelper.toStringList(version.getStandardAnswer())));
            }
        }

        Map<String, String> fileAnswers = new LinkedHashMap<>();
        List<Map<String, Object>> kept = new ArrayList<>();
        for (Map<String, Object> row : validRows) {
            String type = String.valueOf(row.get("type"));
            String stem = String.valueOf(row.getOrDefault("stem", ""));
            List<Map<String, Object>> options = optionsOf(row);
            List<String> answers = answersOf(row);
            String key = QuestionContentFingerprint.contentKey(type, stem, options);
            String answer = QuestionContentFingerprint.answerKey(answers);
            if (fileAnswers.containsKey(key)) {
                boolean same = fileAnswers.get(key).equals(answer);
                errorRows.add(conflictError(
                        row,
                        same ? "duplicate" : "conflict",
                        same ? "与文件内其他行重复，不导入" : "与文件内其他行冲突（题干与选项相同但答案不同），不导入"
                ));
                continue;
            }
            fileAnswers.put(key, answer);
            if (bankAnswers.containsKey(key)) {
                boolean same = bankAnswers.get(key).equals(answer);
                errorRows.add(conflictError(
                        row,
                        same ? "duplicate" : "conflict",
                        same ? "与题库已有题目重复，不导入" : "与题库已有题目冲突（题干与选项相同但答案不同），不导入"
                ));
                continue;
            }
            kept.add(row);
        }
        preview.put("validRows", kept);
        preview.put("errorRows", errorRows);
    }

    static List<String> rowIdentities(List<Map<String, Object>> rows) {
        List<String> ids = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            ids.add(String.valueOf(row.getOrDefault("sheetName", "")) + "#" + row.get("rowNum"));
        }
        return ids;
    }

    private static Map<String, Object> conflictError(Map<String, Object> row, String errorType, String message) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("sheetName", row.get("sheetName"));
        error.put("rowNum", row.get("rowNum"));
        error.put("errorType", errorType);
        error.put("field", "stem");
        error.put("stemSummary", QuestionContentFingerprint.stemSummary(String.valueOf(row.getOrDefault("stem", ""))));
        error.put("message", message);
        return error;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> optionsOf(Map<String, Object> row) {
        return row.get("options") instanceof List<?> list ? (List<Map<String, Object>>) list : List.of();
    }

    private static List<String> answersOf(Map<String, Object> row) {
        return row.get("standardAnswer") instanceof List<?> list
                ? list.stream().map(String::valueOf).toList()
                : List.of();
    }
}
