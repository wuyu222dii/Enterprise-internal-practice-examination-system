package com.examsystem.modules.audit.repository;

import com.examsystem.modules.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    Page<AuditLog> findAllByOrderByOccurredAtDesc(Pageable pageable);
}
