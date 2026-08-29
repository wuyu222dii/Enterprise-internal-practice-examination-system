package com.examsystem.modules.report.repository;

import com.examsystem.modules.report.entity.ExportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExportJobRepository extends JpaRepository<ExportJob, String> {
    List<ExportJob> findByExamIdOrderByCreatedAtDesc(String examId);
}
