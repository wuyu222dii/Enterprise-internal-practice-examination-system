package com.examsystem.modules.mock.dto;

import java.time.Instant;

public record SaveAnswerResponse(
        String itemId,
        int confirmedVersion,
        String saveStatus,
        Instant confirmedAt
) {
}
