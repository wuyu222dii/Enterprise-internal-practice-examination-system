package com.examsystem.modules.importjob.repository;

import com.examsystem.modules.importjob.entity.ImportTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportTaskRepository extends JpaRepository<ImportTask, String> {
    Page<ImportTask> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
