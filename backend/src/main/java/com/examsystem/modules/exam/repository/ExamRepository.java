package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.Exam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamRepository extends JpaRepository<Exam, String> {
    Page<Exam> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Exam> findByLifecycleAndRunStatus(String lifecycle, String runStatus);

    List<Exam> findByLifecycle(String lifecycle);
}
