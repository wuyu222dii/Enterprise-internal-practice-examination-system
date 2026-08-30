package com.examsystem.modules.exam.repository;

import com.examsystem.modules.exam.entity.ExamAssignment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamAssignmentRepository extends JpaRepository<ExamAssignment, String> {
    List<ExamAssignment> findByPublishedVersionId(String publishedVersionId);
    Page<ExamAssignment> findByPublishedVersionIdOrderByEmployeeNoSnapshotAsc(String publishedVersionId, Pageable pageable);
    Optional<ExamAssignment> findByPublishedVersionIdAndEmployeeId(String publishedVersionId, String employeeId);
    List<ExamAssignment> findByEmployeeId(String employeeId);

    long countByPublishedVersionId(String publishedVersionId);
}
