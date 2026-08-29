package com.examsystem.modules.organization;

import com.examsystem.common.ApiResponse;
import com.examsystem.common.MetaFactory;
import com.examsystem.modules.organization.dto.AdminGrantsRequest;
import com.examsystem.modules.organization.dto.CreateDepartmentRequest;
import com.examsystem.modules.organization.dto.CreateEmployeeRequest;
import com.examsystem.modules.organization.dto.CreateEmployeeResponse;
import com.examsystem.modules.organization.dto.DepartmentDto;
import com.examsystem.modules.organization.dto.EmployeeSummaryDto;
import com.examsystem.modules.organization.dto.PagedEmployeesDto;
import com.examsystem.modules.organization.dto.ResetPasswordResponse;
import com.examsystem.modules.organization.dto.UpdateDepartmentRequest;
import com.examsystem.modules.organization.dto.UpdateEmployeeRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@PreAuthorize("hasRole('ADMIN')")
public class OrganizationController {

    private final OrganizationService organizationService;
    private final MetaFactory metaFactory;

    public OrganizationController(OrganizationService organizationService, MetaFactory metaFactory) {
        this.organizationService = organizationService;
        this.metaFactory = metaFactory;
    }

    @GetMapping("/departments")
    public ApiResponse<List<DepartmentDto>> listDepartments(
            @RequestParam(defaultValue = "tree") String format
    ) {
        return ApiResponse.ok(organizationService.listDepartments(format), metaFactory.build());
    }

    @PostMapping("/departments")
    public ResponseEntity<ApiResponse<DepartmentDto>> createDepartment(
            @Valid @RequestBody CreateDepartmentRequest request
    ) {
        DepartmentDto department = organizationService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(department, metaFactory.build()));
    }

    @PatchMapping("/departments/{id}")
    public ApiResponse<Object> updateDepartment(
            @PathVariable String id,
            @RequestBody UpdateDepartmentRequest request
    ) {
        organizationService.updateDepartment(id, request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @GetMapping("/employees")
    public ApiResponse<PagedEmployeesDto> listEmployees(
            @RequestParam(required = false) String departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.ok(
                organizationService.listEmployees(departmentId, status, keyword, page, pageSize),
                metaFactory.build()
        );
    }

    @PostMapping("/employees")
    public ResponseEntity<ApiResponse<CreateEmployeeResponse>> createEmployee(
            @Valid @RequestBody CreateEmployeeRequest request
    ) {
        CreateEmployeeResponse response = organizationService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, metaFactory.build()));
    }

    @GetMapping("/employees/{id}")
    public ApiResponse<EmployeeSummaryDto> getEmployee(@PathVariable String id) {
        return ApiResponse.ok(organizationService.getEmployee(id), metaFactory.build());
    }

    @PatchMapping("/employees/{id}")
    public ApiResponse<Object> updateEmployee(
            @PathVariable String id,
            @RequestBody UpdateEmployeeRequest request
    ) {
        organizationService.updateEmployee(id, request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }

    @PostMapping("/employees/{id}/reset-password")
    public ApiResponse<ResetPasswordResponse> resetEmployeePassword(@PathVariable String id) {
        return ApiResponse.ok(organizationService.resetEmployeePassword(id), metaFactory.build());
    }

    @PatchMapping("/employees/{id}/admin-grants")
    public ApiResponse<Object> updateAdminGrants(
            @PathVariable String id,
            @Valid @RequestBody AdminGrantsRequest request
    ) {
        organizationService.updateAdminGrants(id, request);
        return ApiResponse.ok(Collections.emptyMap(), metaFactory.build());
    }
}
