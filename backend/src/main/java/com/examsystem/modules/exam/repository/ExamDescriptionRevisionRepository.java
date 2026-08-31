package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamDescriptionRevision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamDescriptionRevisionRepository extends JpaRepository<ExamDescriptionRevision, String> {
    List<ExamDescriptionRevision> findByExamIdOrderByCreatedAtDesc(String examId);

    boolean existsByExamId(String examId);
}
