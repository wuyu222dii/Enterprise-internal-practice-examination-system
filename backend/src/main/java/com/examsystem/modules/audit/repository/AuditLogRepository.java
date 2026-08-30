package com.examsystem.modules.audit.repository;

import com.examsystem.modules.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    Page<AuditLog> findAllByOrderByOccurredAtDesc(Pageable pageable);

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:actionType = '' OR a.actionType = :actionType)
              AND (:targetType = '' OR a.targetType = :targetType)
              AND (:targetId = '' OR a.targetId = :targetId)
            ORDER BY a.occurredAt DESC
            """)
    Page<AuditLog> search(
            @Param("actionType") String actionType,
            @Param("targetType") String targetType,
            @Param("targetId") String targetId,
            Pageable pageable
    );
}
