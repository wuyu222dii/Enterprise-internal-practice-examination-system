package com.examsystem.common;

import com.examsystem.modules.question.entity.QuestionVersion;
import com.examsystem.modules.question.QuestionService;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class PaperHelper {

    private PaperHelper() {
    }

    public static Map<String, Object> buildPaper(String attemptId, List<PaperItemSource> items, QuestionService questionService) {
        List<Map<String, Object>> paperItems = items.stream().map(item -> {
            QuestionVersion version = questionService.requireVersion(item.questionVersionId());
            Map<String, Object> dto = new HashMap<>();
            dto.put("itemId", item.itemId());
            dto.put("order", item.order());
            dto.put("questionVersionId", item.questionVersionId());
            dto.put("score", item.score());
            dto.put("type", version.getType());
            dto.put("stem", version.getStem());
            dto.put("options", JsonHelper.toMapList(version.getOptionsJson()));
            return dto;
        }).toList();

        Map<String, Object> paper = new HashMap<>();
        paper.put("attemptId", attemptId);
        paper.put("items", paperItems);
        return paper;
    }

    public record PaperItemSource(String itemId, int order, String questionVersionId, BigDecimal score) {
    }
}
