package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ExamResultRepository extends JpaRepository<ExamResult, String> {
    Optional<ExamResult> findByExamAttemptId(String examAttemptId);
}
