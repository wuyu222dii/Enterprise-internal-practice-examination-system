package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamPublishedVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamPublishedVersionRepository extends JpaRepository<ExamPublishedVersion, String> {
    List<ExamPublishedVersion> findByExamIdOrderByVersionNoDesc(String examId);
    Optional<ExamPublishedVersion> findTopByExamIdOrderByVersionNoDesc(String examId);
}
