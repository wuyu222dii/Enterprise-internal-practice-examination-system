package com.examsystem.modules.exam.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "exam_assignments")
public class ExamAssignment {
    @Id private String id;
    @Column(name = "published_version_id", nullable = false, length = 32) private String publishedVersionId;
    @Column(name = "employee_id", nullable = false, length = 32) private String employeeId;
    @Column(name = "employee_no_snapshot", nullable = false, length = 50) private String employeeNoSnapshot;
    @Column(name = "display_name_snapshot", nullable = false, length = 100) private String displayNameSnapshot;
    @Column(name = "department_path_snapshot", nullable = false, length = 500) private String departmentPathSnapshot;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPublishedVersionId() { return publishedVersionId; }
    public void setPublishedVersionId(String publishedVersionId) { this.publishedVersionId = publishedVersionId; }
    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    public String getEmployeeNoSnapshot() { return employeeNoSnapshot; }
    public void setEmployeeNoSnapshot(String employeeNoSnapshot) { this.employeeNoSnapshot = employeeNoSnapshot; }
    public String getDisplayNameSnapshot() { return displayNameSnapshot; }
    public void setDisplayNameSnapshot(String displayNameSnapshot) { this.displayNameSnapshot = displayNameSnapshot; }
    public String getDepartmentPathSnapshot() { return departmentPathSnapshot; }
    public void setDepartmentPathSnapshot(String departmentPathSnapshot) { this.departmentPathSnapshot = departmentPathSnapshot; }
}
