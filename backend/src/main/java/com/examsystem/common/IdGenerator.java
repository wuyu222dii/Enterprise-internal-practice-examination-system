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

    /** Readable unique exam locate code, e.g. EX-A3K9M2 (Crockford alphabet, no I/L/O/U). */
    public static String examCode() {
        char[] alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ".toCharArray();
        char[] buf = new char[6];
        for (int i = 0; i < buf.length; i++) {
            buf[i] = alphabet[RANDOM.nextInt(alphabet.length)];
        }
        return "EX-" + new String(buf);
    }

    public static Instant now() {
        return Instant.now();
    }
}
