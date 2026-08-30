package com.examsystem.modules.mock.repository;

import com.examsystem.modules.mock.entity.MockAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MockAttemptRepository extends JpaRepository<MockAttempt, String> {
    Optional<MockAttempt> findByEmployeeIdAndStatus(String employeeId, String status);
    Page<MockAttempt> findByEmployeeIdOrderByCreatedAtDesc(String employeeId, Pageable pageable);

    List<MockAttempt> findByStatusAndExpiresAtBefore(String status, Instant expiresAt);
}
