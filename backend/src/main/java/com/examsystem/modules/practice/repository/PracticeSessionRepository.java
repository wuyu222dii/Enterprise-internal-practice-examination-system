package com.examsystem.modules.practice.repository;

import com.examsystem.modules.practice.entity.PracticeSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, String> {
    Optional<PracticeSession> findByEmployeeIdAndStatus(String employeeId, String status);
    Page<PracticeSession> findByEmployeeIdOrderByCreatedAtDesc(String employeeId, Pageable pageable);
}
