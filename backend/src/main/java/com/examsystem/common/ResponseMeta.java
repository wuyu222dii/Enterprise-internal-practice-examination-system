package com.examsystem.common;

import java.time.Instant;

public record ResponseMeta(Instant serverNow, String requestId) {
}
