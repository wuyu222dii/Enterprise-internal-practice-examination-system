package com.examsystem.common;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

public final class IdGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();

    private IdGenerator() {
    }

    public static String newId(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    public static String requestId() {
        return "req_" + Long.toHexString(RANDOM.nextLong() & Long.MAX_VALUE);
    }

    public static Instant now() {
        return Instant.now();
    }
}
