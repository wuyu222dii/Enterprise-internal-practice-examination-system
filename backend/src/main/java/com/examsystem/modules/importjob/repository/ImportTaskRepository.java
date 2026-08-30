package com.examsystem.modules.importjob.repository;

import com.examsystem.modules.importjob.entity.ImportTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ImportTaskRepository extends JpaRepository<ImportTask, String> {
    Page<ImportTask> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<ImportTask> findByStatusInAndCreatedAtBefore(Collection<String> statuses, Instant createdAt);

    List<ImportTask> findByFileKeyIsNotNullAndCreatedAtBefore(Instant createdAt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM ImportTask t WHERE t.id = :id")
    Optional<ImportTask> findByIdForUpdate(@Param("id") String id);
}
