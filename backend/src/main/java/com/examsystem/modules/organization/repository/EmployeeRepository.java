package com.examsystem.modules.organization.repository;

import com.examsystem.modules.organization.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, String> {

    Optional<Employee> findByEmployeeNo(String employeeNo);

    Optional<Employee> findByPhone(String phone);

    Optional<Employee> findByMiniProgramOpenId(String miniProgramOpenId);

    long countByDepartmentIdAndStatus(String departmentId, String status);

    long countByHasOutageDispositionTrueAndStatus(String status);

    long countByAdminTrueAndStatus(String status);

    /**
     * {@code keywordPattern} must always be a non-null LIKE pattern ("%" matches everything).
     * PostgreSQL cannot infer the type of a NULL parameter inside a LIKE and rejects the query with
     * "operator does not exist: character varying ~~ bytea", so use
     * {@link #searchEmployees(String, String, String, Pageable)} rather than calling this directly.
     */
    @Query("""
            SELECT e FROM Employee e
            WHERE (:departmentId IS NULL OR e.departmentId = :departmentId)
              AND (:status IS NULL OR e.status = :status)
              AND (e.employeeNo LIKE :keywordPattern OR e.displayName LIKE :keywordPattern)
            ORDER BY e.employeeNo ASC
            """)
    Page<Employee> search(
            @Param("departmentId") String departmentId,
            @Param("status") String status,
            @Param("keywordPattern") String keywordPattern,
            Pageable pageable
    );

    default Page<Employee> searchEmployees(String departmentId, String status, String keyword, Pageable pageable) {
        String keywordPattern = keyword == null || keyword.isBlank() ? "%" : "%" + keyword + "%";
        return search(departmentId, status, keywordPattern, pageable);
    }

    /**
     * Only the two columns batch import needs for duplicate detection, so a 5,000-employee
     * population does not get hydrated into entities.
     */
    @Query("SELECT e.employeeNo, e.phone FROM Employee e")
    List<Object[]> findAllIdentifiers();
}
