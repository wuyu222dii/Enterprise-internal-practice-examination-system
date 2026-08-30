package com.examsystem.modules.organization.repository;

import com.examsystem.modules.organization.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, String> {

    Optional<Employee> findByEmployeeNo(String employeeNo);

    Optional<Employee> findByPhone(String phone);

    Optional<Employee> findByMiniProgramOpenId(String miniProgramOpenId);

    long countByDepartmentIdAndStatus(String departmentId, String status);

    long countByHasOutageDispositionTrueAndStatus(String status);

    long countByAdminTrueAndStatus(String status);

    @Query("""
            SELECT e FROM Employee e
            WHERE (:departmentId IS NULL OR e.departmentId = :departmentId)
              AND (:status IS NULL OR e.status = :status)
              AND (:keyword IS NULL OR e.employeeNo LIKE CONCAT('%', :keyword, '%')
                   OR e.displayName LIKE CONCAT('%', :keyword, '%'))
            ORDER BY e.employeeNo ASC
            """)
    Page<Employee> search(
            @Param("departmentId") String departmentId,
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
