package com.examsystem.modules.organization.repository;

import com.examsystem.modules.organization.entity.EmployeeCredentialBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeCredentialBatchRepository extends JpaRepository<EmployeeCredentialBatch, String> {
    List<EmployeeCredentialBatch> findByFileKeyIsNotNull();
}
