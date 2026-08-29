package com.examsystem.common;

import com.examsystem.common.entity.IdempotencyRecord;
import com.examsystem.common.repository.IdempotencyRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.function.Supplier;

@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository repository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public <T> Optional<T> find(String idempotencyKey, String scope, Class<T> type) {
        return repository.findByIdempotencyKeyAndScope(idempotencyKey, scope)
                .map(record -> deserialize(record.getResponseJson(), type));
    }

    @Transactional
    public <T> T execute(String idempotencyKey, String scope, Class<T> type, Supplier<T> action) {
        Optional<T> existing = find(idempotencyKey, scope, type);
        if (existing.isPresent()) {
            return existing.get();
        }
        T result = action.get();
        store(idempotencyKey, scope, result);
        return result;
    }

    @Transactional
    public void store(String idempotencyKey, String scope, Object response) {
        if (repository.findByIdempotencyKeyAndScope(idempotencyKey, scope).isPresent()) {
            return;
        }
        IdempotencyRecord record = new IdempotencyRecord();
        record.setId(IdGenerator.newId("idem"));
        record.setIdempotencyKey(idempotencyKey);
        record.setScope(scope);
        record.setResponseJson(JsonHelper.toJson(response));
        repository.save(record);
    }

    private <T> T deserialize(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize idempotency response", e);
        }
    }
}
