package com.examsystem.modules.organization.repository;

import com.examsystem.modules.organization.entity.EmployeeCredentialBatch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeCredentialBatchRepository extends JpaRepository<EmployeeCredentialBatch, String> {
}
