package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamAttempt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, String> {

    Optional<ExamAttempt> findByExamIdAndEmployeeIdAndAttemptStatusIn(
            String examId, String employeeId, List<String> statuses);

    List<ExamAttempt> findByExamId(String examId);

    Page<ExamAttempt> findByExamId(String examId, Pageable pageable);

    List<ExamAttempt> findByAttemptStatusAndExpiresAtBefore(String status, Instant expiresAt);

    long countByExamIdAndEmployeeId(String examId, String employeeId);

    Page<ExamAttempt> findByEmployeeIdOrderByCreatedAtDesc(String employeeId, Pageable pageable);
}
