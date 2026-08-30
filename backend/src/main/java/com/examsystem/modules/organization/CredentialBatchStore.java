package com.examsystem.modules.organization;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CredentialBatchStore {

    private final Map<String, byte[]> files = new ConcurrentHashMap<>();

    public void put(String batchId, byte[] content) {
        files.put(batchId, content);
    }

    public Optional<byte[]> get(String batchId) {
        return Optional.ofNullable(files.get(batchId));
    }
}
