package com.examsystem.modules.importjob;

import com.examsystem.modules.question.entity.QuestionVersion;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class QuestionImportDeduperTest {

    @Test
    void fileDuplicateAndConflictAreNotImportable() {
        Map<String, Object> preview = new HashMap<>();
        preview.put("validRows", new ArrayList<>(List.of(
                row(2, "同一题", List.of("B")),
                row(3, "同一题", List.of("B")),
                row(4, "同一题", List.of("A"))
        )));
        preview.put("errorRows", new ArrayList<>());

        QuestionImportDeduper.apply(preview, List.of());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> valid = (List<Map<String, Object>>) preview.get("validRows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> errors = (List<Map<String, Object>>) preview.get("errorRows");
        assertThat(valid).hasSize(1);
        assertThat(errors).extracting(e -> e.get("errorType")).containsExactly("duplicate", "conflict");
        assertThat(errors).allSatisfy(error -> assertThat(error.get("field")).isEqualTo("stem"));
    }

    @Test
    void bankDuplicateBlocksImport() {
        QuestionVersion existing = new QuestionVersion();
        existing.setType("singleChoice");
        existing.setStem("库中已有");
        existing.setOptionsJson("[{\"key\":\"A\",\"text\":\"1\"},{\"key\":\"B\",\"text\":\"2\"}]");
        existing.setStandardAnswer("[\"B\"]");

        Map<String, Object> preview = new HashMap<>();
        preview.put("validRows", new ArrayList<>(List.of(row(2, "库中已有", List.of("B")))));
        preview.put("errorRows", new ArrayList<>());
        QuestionImportDeduper.apply(preview, List.of(existing));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> valid = (List<Map<String, Object>>) preview.get("validRows");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> errors = (List<Map<String, Object>>) preview.get("errorRows");
        assertThat(valid).isEmpty();
        assertThat(errors.get(0).get("errorType")).isEqualTo("duplicate");
    }

    private static Map<String, Object> row(int rowNum, String stem, List<String> answer) {
        Map<String, Object> row = new HashMap<>();
        row.put("sheetName", "questions");
        row.put("rowNum", rowNum);
        row.put("type", "singleChoice");
        row.put("stem", stem);
        row.put("options", List.of(
                Map.of("key", "A", "text", "1"),
                Map.of("key", "B", "text", "2")
        ));
        row.put("standardAnswer", answer);
        return row;
    }
}
