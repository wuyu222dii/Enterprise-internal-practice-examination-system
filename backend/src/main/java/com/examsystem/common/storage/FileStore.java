package com.examsystem.common.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Optional;

/**
 * Binary artifact storage for generated files (score exports, credential batches).
 * Implementations must survive an application restart so that persisted file keys stay resolvable.
 */
public interface FileStore {

    void write(String fileKey, ContentWriter writer);

    Optional<Resource> read(String fileKey);

    @FunctionalInterface
    interface ContentWriter {
        void writeTo(OutputStream out) throws IOException;
    }
}
