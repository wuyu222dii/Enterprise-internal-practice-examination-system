package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamPaperItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamPaperItemRepository extends JpaRepository<ExamPaperItem, String> {
    List<ExamPaperItem> findByExamAttemptIdOrderByItemOrderAsc(String examAttemptId);
}
