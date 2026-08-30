package com.examsystem.modules.organization;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.storage.FileStore;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.auth.SessionService;
import com.examsystem.modules.organization.dto.AdminGrantsRequest;
import com.examsystem.modules.organization.dto.CreateDepartmentRequest;
import com.examsystem.modules.organization.dto.CreateEmployeeRequest;
import com.examsystem.modules.organization.dto.CreateEmployeeResponse;
import com.examsystem.modules.organization.dto.DepartmentDto;
import com.examsystem.modules.organization.dto.EmployeeImportResponse;
import com.examsystem.modules.organization.dto.EmployeeSummaryDto;
import com.examsystem.modules.organization.dto.PagedEmployeesDto;
import com.examsystem.modules.organization.dto.ResetPasswordResponse;
import com.examsystem.modules.organization.dto.UpdateDepartmentRequest;
import com.examsystem.modules.organization.dto.UpdateEmployeeRequest;
import com.examsystem.modules.organization.entity.Department;
import com.examsystem.modules.organization.entity.Employee;
import com.examsystem.modules.organization.entity.EmployeeCredentialBatch;
import com.examsystem.modules.organization.repository.DepartmentRepository;
import com.examsystem.modules.organization.repository.EmployeeCredentialBatchRepository;
import com.examsystem.modules.organization.repository.EmployeeRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OrganizationService {

    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeCredentialBatchRepository credentialBatchRepository;
    private final FileStore fileStore;
    private final EmployeeImportService employeeImportService;
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessionService;
    private final AuditService auditService;

    public OrganizationService(
            DepartmentRepository departmentRepository,
            EmployeeRepository employeeRepository,
            EmployeeCredentialBatchRepository credentialBatchRepository,
            FileStore fileStore,
            EmployeeImportService employeeImportService,
            PasswordEncoder passwordEncoder,
            SessionService sessionService,
            AuditService auditService
    ) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
        this.credentialBatchRepository = credentialBatchRepository;
        this.fileStore = fileStore;
        this.employeeImportService = employeeImportService;
        this.passwordEncoder = passwordEncoder;
        this.sessionService = sessionService;
        this.auditService = auditService;
    }

    public List<DepartmentDto> listDepartments(String format) {
        List<Department> departments = departmentRepository.findAllByOrderByPathAsc();
        Map<String, Long> employeeCounts = departments.stream()
                .collect(Collectors.toMap(
                        Department::getId,
                        dept -> employeeRepository.countByDepartmentIdAndStatus(dept.getId(), "active")
                ));

        if ("flat".equalsIgnoreCase(format)) {
            return departments.stream()
                    .map(dept -> toDepartmentDto(dept, employeeCounts.getOrDefault(dept.getId(), 0L), null))
                    .toList();
        }
        return buildDepartmentTree(departments, employeeCounts);
    }

    @Transactional
    public DepartmentDto createDepartment(CreateDepartmentRequest request) {
        Department parent = departmentRepository.findById(request.parentId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "父部门不存在", 404));

        departmentRepository.findByParentIdAndName(request.parentId(), request.name())
                .ifPresent(existing -> {
                    throw BusinessException.of(ErrorCode.ORG_DEPARTMENT_NAME_DUPLICATE, "同级部门名称重复", 422);
                });

        Department department = new Department();
        department.setId(IdGenerator.newId("dept"));
        department.setName(request.name());
        department.setParentId(request.parentId());
        department.setPath(parent.getPath() + "/" + request.name());
        department.setStatus("active");
        departmentRepository.save(department);

        long employeeCount = employeeRepository.countByDepartmentIdAndStatus(department.getId(), "active");
        return toDepartmentDto(department, employeeCount, Collections.emptyList());
    }

    @Transactional
    public void updateDepartment(String id, UpdateDepartmentRequest request) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "部门不存在", 404));

        if (request.name() != null && !request.name().isBlank()) {
            String parentId = request.parentId() != null ? request.parentId() : department.getParentId();
            departmentRepository.findByParentIdAndName(parentId, request.name())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw BusinessException.of(ErrorCode.ORG_DEPARTMENT_NAME_DUPLICATE, "同级部门名称重复", 422);
                    });
            department.setName(request.name());
        }

        if (request.parentId() != null && !request.parentId().equals(department.getParentId())) {
            moveDepartment(department, request.parentId());
        } else if (request.name() != null && !request.name().isBlank()) {
            updateDepartmentPath(department);
        }

        if (request.status() != null) {
            if ("disabled".equals(request.status())) {
                if (departmentRepository.existsByParentId(id)) {
                    throw BusinessException.of(ErrorCode.ORG_DEPARTMENT_HAS_CHILDREN, "存在下级部门，无法停用", 422);
                }
                if (employeeRepository.countByDepartmentIdAndStatus(id, "active") > 0) {
                    throw BusinessException.of(ErrorCode.ORG_DEPARTMENT_HAS_EMPLOYEES, "存在在职员工，无法停用", 422);
                }
            }
            department.setStatus(request.status());
        }

        departmentRepository.save(department);
    }

    public PagedEmployeesDto listEmployees(String departmentId, String status, String keyword, int page, int pageSize) {
        int safePage = Math.max(page, 1);
        int safePageSize = Math.min(Math.max(pageSize, 1), 100);
        Pageable pageable = PageRequest.of(safePage - 1, safePageSize);
        Page<Employee> result = employeeRepository.searchEmployees(
                blankToNull(departmentId),
                blankToNull(status),
                blankToNull(keyword),
                pageable
        );
        Map<String, String> departmentPaths = loadDepartmentPaths();
        List<EmployeeSummaryDto> items = result.getContent().stream()
                .map(employee -> toEmployeeSummary(employee, departmentPaths))
                .toList();
        return new PagedEmployeesDto(items, result.getTotalElements(), safePage, safePageSize);
    }

    @Transactional
    public CreateEmployeeResponse createEmployee(CreateEmployeeRequest request) {
        if (employeeRepository.findByEmployeeNo(request.employeeNo()).isPresent()) {
            throw BusinessException.of(ErrorCode.ORG_DUPLICATE_EMPLOYEE_NO, "工号已存在", 422);
        }
        if (request.phone() != null && !request.phone().isBlank()
                && employeeRepository.findByPhone(request.phone()).isPresent()) {
            throw BusinessException.of(ErrorCode.ORG_DUPLICATE_PHONE, "手机号已存在", 422);
        }

        Department department = resolveDepartmentByPath(request.departmentPath());
        String temporaryPassword = generateTemporaryPassword();

        Employee employee = new Employee();
        employee.setId(IdGenerator.newId("emp"));
        employee.setEmployeeNo(request.employeeNo());
        employee.setDisplayName(request.displayName());
        employee.setDepartmentId(department.getId());
        employee.setPhone(blankToNull(request.phone()));
        employee.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        employee.setStatus("active");
        employee.setAdmin(false);
        employee.setHasOutageDisposition(false);
        employee.setMustChangePassword(true);
        employee.setFailedLoginCount(0);
        employeeRepository.save(employee);

        auditService.log(
                "employee.create",
                "Employee",
                employee.getId(),
                null,
                Map.of(
                        "employeeNo", employee.getEmployeeNo(),
                        "displayName", employee.getDisplayName(),
                        "departmentId", employee.getDepartmentId()
                ),
                null
        );

        Map<String, String> departmentPaths = loadDepartmentPaths();
        EmployeeSummaryDto summary = toEmployeeSummary(employee, departmentPaths);
        return new CreateEmployeeResponse(summary, temporaryPassword, null);
    }

    public EmployeeSummaryDto getEmployee(String id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "员工不存在", 404));
        return toEmployeeSummary(employee, loadDepartmentPaths());
    }

    @Transactional
    public void updateEmployee(String id, UpdateEmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "员工不存在", 404));

        if (request.displayName() != null && !request.displayName().isBlank()) {
            employee.setDisplayName(request.displayName());
        }
        if (request.departmentPath() != null && !request.departmentPath().isBlank()) {
            Department department = resolveDepartmentByPath(request.departmentPath());
            employee.setDepartmentId(department.getId());
        }
        if (request.phone() != null) {
            if (!request.phone().isBlank()) {
                employeeRepository.findByPhone(request.phone())
                        .filter(existing -> !existing.getId().equals(id))
                        .ifPresent(existing -> {
                            throw BusinessException.of(ErrorCode.ORG_DUPLICATE_PHONE, "手机号已存在", 422);
                        });
            }
            employee.setPhone(blankToNull(request.phone()));
        }
        if (request.status() != null) {
            String oldStatus = employee.getStatus();
            employee.setStatus(request.status());
            if ("disabled".equals(request.status())) {
                sessionService.invalidateAllSessions(employee.getId());
                auditService.log(
                        "employee.disable",
                        "Employee",
                        employee.getId(),
                        Map.of("status", oldStatus),
                        Map.of("status", "disabled"),
                        null
                );
            }
        }

        employeeRepository.save(employee);
    }

    @Transactional
    public ResetPasswordResponse resetEmployeePassword(String id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "员工不存在", 404));

        String temporaryPassword = generateTemporaryPassword();
        employee.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        employee.setMustChangePassword(true);
        employee.setFailedLoginCount(0);
        employee.setLockedUntil(null);
        employeeRepository.save(employee);
        sessionService.invalidateAllSessions(employee.getId());

        return new ResetPasswordResponse(temporaryPassword);
    }

    @Transactional
    public void updateAdminGrants(String id, AdminGrantsRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "员工不存在", 404));

        boolean newAdmin = request.isAdmin() != null ? request.isAdmin() : employee.isAdmin();
        boolean newOutageDisposition = request.hasOutageDisposition() != null
                ? request.hasOutageDisposition()
                : employee.isHasOutageDisposition();

        if (employee.isAdmin() && !newAdmin) {
            long remainingAdmins = employeeRepository.countByAdminTrueAndStatus("active");
            if (remainingAdmins <= 1) {
                throw BusinessException.of(ErrorCode.ORG_LAST_ADMIN, "不能移除最后一位管理员", 422);
            }
        }

        if (employee.isHasOutageDisposition() && !newOutageDisposition) {
            long remaining = employeeRepository.countByHasOutageDispositionTrueAndStatus("active");
            if (remaining <= 1) {
                throw BusinessException.of(
                        ErrorCode.ORG_LAST_OUTAGE_ADMIN,
                        "不能移除最后一位异常处置授权人",
                        422
                );
            }
        }

        Map<String, Object> before = Map.of(
                "isAdmin", employee.isAdmin(),
                "hasOutageDisposition", employee.isHasOutageDisposition()
        );
        employee.setAdmin(newAdmin);
        employee.setHasOutageDisposition(newOutageDisposition);
        employeeRepository.save(employee);
        auditService.log(
                "adminGrants.update",
                "Employee",
                employee.getId(),
                before,
                Map.of("isAdmin", newAdmin, "hasOutageDisposition", newOutageDisposition),
                request.reason()
        );
    }

    public EmployeeImportResponse importEmployees(org.springframework.web.multipart.MultipartFile file) {
        return employeeImportService.importEmployees(file);
    }

    @Transactional
    public Resource downloadCredentialBatch(String batchId) {
        EmployeeCredentialBatch batch = credentialBatchRepository.findById(batchId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "凭据批次不存在", 404));

        String currentUserId = SecurityUtils.requirePrincipal().getEmployeeId();
        if (!batch.getCreatedBy().equals(currentUserId)) {
            throw BusinessException.of(ErrorCode.SEC_FORBIDDEN, "无权下载该凭据批次", 403);
        }
        if (batch.getExpiresAt().isBefore(Instant.now())) {
            throw BusinessException.of(ErrorCode.ORG_CREDENTIAL_BATCH_EXPIRED, "凭据批次已过期", 410);
        }
        if (batch.getDownloadedAt() != null) {
            throw BusinessException.of(ErrorCode.ORG_CREDENTIAL_ALREADY_DOWNLOADED, "凭据已下载过", 410);
        }

        Resource content = fileStore.read(batch.getFileKey())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "凭据文件不存在", 404));

        batch.setDownloadedAt(Instant.now());
        credentialBatchRepository.save(batch);
        return content;
    }

    private void moveDepartment(Department department, String newParentId) {
        if (department.getId().equals(newParentId)) {
            throw BusinessException.of(ErrorCode.ORG_DEPARTMENT_CYCLE, "不能将部门移动到自身", 422);
        }
        Department newParent = departmentRepository.findById(newParentId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "目标父部门不存在", 404));
        if (newParent.getPath().startsWith(department.getPath() + "/")
                || newParent.getPath().equals(department.getPath())) {
            throw BusinessException.of(ErrorCode.ORG_DEPARTMENT_CYCLE, "不能将部门移动到其子部门下", 422);
        }

        String oldPathPrefix = department.getPath();
        department.setParentId(newParentId);
        department.setPath(newParent.getPath() + "/" + department.getName());
        departmentRepository.save(department);
        updateDescendantPaths(department, oldPathPrefix);
    }

    private void updateDepartmentPath(Department department) {
        String oldPathPrefix = department.getPath();
        if (department.getParentId() == null) {
            department.setPath("/" + department.getName());
        } else {
            Department parent = departmentRepository.findById(department.getParentId())
                    .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "父部门不存在", 404));
            department.setPath(parent.getPath() + "/" + department.getName());
        }
        departmentRepository.save(department);
        updateDescendantPaths(department, oldPathPrefix);
    }

    private void updateDescendantPaths(Department department, String oldPathPrefix) {
        List<Department> updated = new ArrayList<>();
        for (Department descendant : departmentRepository.findAllByOrderByPathAsc()) {
            if (descendant.getPath().startsWith(oldPathPrefix + "/")) {
                descendant.setPath(department.getPath() + descendant.getPath().substring(oldPathPrefix.length()));
                updated.add(descendant);
            }
        }
        departmentRepository.saveAll(updated);
    }

    private List<DepartmentDto> buildDepartmentTree(List<Department> departments, Map<String, Long> employeeCounts) {
        Map<String, List<Department>> childrenByParent = departments.stream()
                .filter(department -> department.getParentId() != null)
                .collect(Collectors.groupingBy(Department::getParentId));

        return departments.stream()
                .filter(department -> department.getParentId() == null)
                .map(department -> toDepartmentDtoRecursive(department, childrenByParent, employeeCounts))
                .toList();
    }

    private DepartmentDto toDepartmentDtoRecursive(
            Department department,
            Map<String, List<Department>> childrenByParent,
            Map<String, Long> employeeCounts
    ) {
        List<DepartmentDto> children = childrenByParent.getOrDefault(department.getId(), List.of()).stream()
                .map(child -> toDepartmentDtoRecursive(child, childrenByParent, employeeCounts))
                .toList();
        return toDepartmentDto(department, employeeCounts.getOrDefault(department.getId(), 0L), children);
    }

    private DepartmentDto toDepartmentDto(Department department, long employeeCount, List<DepartmentDto> children) {
        return new DepartmentDto(
                department.getId(),
                department.getName(),
                department.getParentId(),
                department.getPath(),
                department.getStatus(),
                employeeCount,
                children != null ? children : Collections.emptyList()
        );
    }

    private EmployeeSummaryDto toEmployeeSummary(Employee employee, Map<String, String> departmentPaths) {
        return new EmployeeSummaryDto(
                employee.getId(),
                employee.getEmployeeNo(),
                employee.getDisplayName(),
                departmentPaths.getOrDefault(employee.getDepartmentId(), ""),
                maskPhone(employee.getPhone()),
                employee.getStatus(),
                employee.isAdmin(),
                employee.isHasOutageDisposition()
        );
    }

    private Department resolveDepartmentByPath(String departmentPath) {
        return departmentRepository.findAllByOrderByPathAsc().stream()
                .filter(dept -> dept.getPath().equals(departmentPath))
                .findFirst()
                .orElseThrow(() -> BusinessException.of(
                        ErrorCode.ORG_INVALID_DEPARTMENT_PATH,
                        "部门路径无效",
                        422
                ));
    }

    private Map<String, String> loadDepartmentPaths() {
        return departmentRepository.findAllByOrderByPathAsc().stream()
                .collect(Collectors.toMap(Department::getId, Department::getPath));
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return null;
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            password.append(TEMP_PASSWORD_CHARS.charAt(RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return password.toString();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
