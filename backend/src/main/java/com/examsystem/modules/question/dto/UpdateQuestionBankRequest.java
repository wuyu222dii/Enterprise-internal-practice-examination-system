package com.examsystem.modules.question.dto;

public record UpdateQuestionBankRequest(
        String name,
        String status,
        Boolean practiceEnabled,
        Boolean mockEnabled
) {
}
