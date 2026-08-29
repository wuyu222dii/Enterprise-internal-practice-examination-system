package com.examsystem.modules.exam.dto;

import java.time.Instant;

public record SaveAnswerResponse(
        String itemId,
        int confirmedVersion,
        String saveStatus,
        Instant confirmedAt
) {
}
