package com.examsystem.common.repository;

import com.examsystem.common.entity.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, String> {

    Optional<IdempotencyRecord> findByIdempotencyKeyAndScope(String idempotencyKey, String scope);
}
