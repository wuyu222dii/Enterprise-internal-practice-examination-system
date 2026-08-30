package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ExamResultRepository extends JpaRepository<ExamResult, String> {
    Optional<ExamResult> findByExamAttemptId(String examAttemptId);

    List<ExamResult> findByExamAttemptIdIn(Collection<String> examAttemptIds);

    @Query("""
            SELECT COUNT(r) FROM ExamResult r
            WHERE r.officialValid = true AND r.passed = true
              AND r.examAttemptId IN (SELECT a.id FROM ExamAttempt a WHERE a.examId = :examId)
            """)
    long countOfficialPassedByExamId(@Param("examId") String examId);

    @Query("""
            SELECT COUNT(r) FROM ExamResult r
            WHERE r.officialValid = true AND (r.passed = false OR r.passed IS NULL)
              AND r.examAttemptId IN (SELECT a.id FROM ExamAttempt a WHERE a.examId = :examId)
            """)
    long countOfficialFailedByExamId(@Param("examId") String examId);
}
