package com.examsystem.modules.organization.repository;

import com.examsystem.modules.organization.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, String> {

    List<Department> findAllByOrderByPathAsc();

    Optional<Department> findByParentIdAndName(String parentId, String name);

    boolean existsByParentId(String parentId);
}
