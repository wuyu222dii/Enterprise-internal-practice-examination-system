package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamAnswerRepository extends JpaRepository<ExamAnswer, String> {
    Optional<ExamAnswer> findByExamAttemptIdAndPaperItemId(String attemptId, String itemId);
    List<ExamAnswer> findByExamAttemptId(String attemptId);
}
