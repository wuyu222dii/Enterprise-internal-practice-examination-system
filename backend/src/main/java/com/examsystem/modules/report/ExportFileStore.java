package com.examsystem.modules.report;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ExportFileStore {

    private final Map<String, byte[]> files = new ConcurrentHashMap<>();

    public void put(String fileKey, byte[] content) {
        files.put(fileKey, content);
    }

    public Optional<byte[]> get(String fileKey) {
        return Optional.ofNullable(files.get(fileKey));
    }
}
