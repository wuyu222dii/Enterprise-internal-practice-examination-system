package com.examsystem.common.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

@Component
public class LocalFileStore implements FileStore {

    private final Path root;

    public LocalFileStore(@Value("${exam.storage.local-path:./data/storage}") String localPath) {
        this.root = Paths.get(localPath).toAbsolutePath().normalize();
    }

    @Override
    public void write(String fileKey, ContentWriter writer) {
        Path target = resolve(fileKey);
        try {
            Files.createDirectories(target.getParent());
            Path temp = Files.createTempFile(target.getParent(), ".partial-", ".tmp");
            try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(temp))) {
                writer.writeTo(out);
            }
            move(temp, target);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to write file " + fileKey, e);
        }
    }

    @Override
    public Optional<Resource> read(String fileKey) {
        Path target = resolve(fileKey);
        if (!Files.isRegularFile(target)) {
            return Optional.empty();
        }
        return Optional.of(new FileSystemResource(target));
    }

    private void move(Path temp, Path target) throws IOException {
        try {
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ex) {
            Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private Path resolve(String fileKey) {
        Path resolved = root.resolve(fileKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid file key: " + fileKey);
        }
        return resolved;
    }
}
