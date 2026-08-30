package com.examsystem.common.storage;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "exam.storage.backend", havingValue = "minio")
public class MinioFileStore implements FileStore {

    private final MinioClient client;
    private final String bucket;

    public MinioFileStore(
            @Value("${exam.storage.minio-endpoint}") String endpoint,
            @Value("${exam.storage.minio-access-key}") String accessKey,
            @Value("${exam.storage.minio-secret-key}") String secretKey,
            @Value("${exam.storage.bucket}") String bucket
    ) {
        this.client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        this.bucket = bucket;
    }

    @PostConstruct
    void ensureBucket() {
        try {
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize MinIO bucket " + bucket, e);
        }
    }

    @Override
    public void write(String fileKey, ContentWriter writer) {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try {
            writer.writeTo(buffer);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to buffer file " + fileKey, e);
        }
        byte[] data = buffer.toByteArray();
        try (ByteArrayInputStream in = new ByteArrayInputStream(data)) {
            client.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(fileKey)
                    .stream(in, data.length, -1)
                    .build());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to write MinIO object " + fileKey, e);
        }
    }

    @Override
    public Optional<Resource> read(String fileKey) {
        try {
            client.statObject(StatObjectArgs.builder().bucket(bucket).object(fileKey).build());
        } catch (Exception e) {
            return Optional.empty();
        }
        try {
            InputStream stream = client.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(fileKey)
                    .build());
            return Optional.of(new InputStreamResource(stream));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read MinIO object " + fileKey, e);
        }
    }

    @Override
    public void delete(String fileKey) {
        try {
            client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(fileKey).build());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to delete MinIO object " + fileKey, e);
        }
    }
}
