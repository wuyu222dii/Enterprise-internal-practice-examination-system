package com.examsystem.modules.organization;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.ExcelCellHelper;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.storage.FileStore;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.organization.dto.EmployeeImportResponse;
import com.examsystem.modules.organization.entity.Department;
import com.examsystem.modules.organization.entity.Employee;
import com.examsystem.modules.organization.entity.EmployeeCredentialBatch;
import com.examsystem.modules.organization.repository.DepartmentRepository;
import com.examsystem.modules.organization.repository.EmployeeCredentialBatchRepository;
import com.examsystem.modules.organization.repository.EmployeeRepository;
import com.examsystem.security.SecurityUtils;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EmployeeImportService {

    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String[] HEADERS = {"employeeNo", "displayName", "departmentPath", "phone"};
    private static final Set<String> EXPECTED_HEADERS = Set.of(HEADERS);

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeCredentialBatchRepository credentialBatchRepository;
    private final FileStore fileStore;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final DataFormatter dataFormatter = new DataFormatter();

    public EmployeeImportService(
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            EmployeeCredentialBatchRepository credentialBatchRepository,
            FileStore fileStore,
            PasswordEncoder passwordEncoder,
            AuditService auditService
    ) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.credentialBatchRepository = credentialBatchRepository;
        this.fileStore = fileStore;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional
    public EmployeeImportResponse importEmployees(MultipartFile file) {
        if (file.getOriginalFilename() == null || !file.getOriginalFilename().endsWith(".xlsx")) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "仅支持 .xlsx 文件", 422);
        }

        Map<String, Department> departmentsByPath = departmentRepository.findAllByOrderByPathAsc().stream()
                .collect(Collectors.toMap(Department::getPath, d -> d, (a, b) -> a));

        List<Map<String, Object>> skippedRows = new ArrayList<>();
        List<CredentialRow> created = new ArrayList<>();
        List<Employee> newEmployees = new ArrayList<>();
        Set<String> seenEmployeeNos = new HashSet<>();
        Set<String> seenPhones = new HashSet<>();
        for (Object[] identifiers : employeeRepository.findAllIdentifiers()) {
            seenEmployeeNos.add((String) identifiers[0]);
            String phone = (String) identifiers[1];
            if (phone != null && !phone.isBlank()) {
                seenPhones.add(phone);
            }
        }

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null || !validateHeaders(headerRow)) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "表头不正确", 422);
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isEmptyRow(row)) {
                    continue;
                }
                int rowNum = i + 1;
                String employeeNo = cellValue(row, 0);
                String displayName = cellValue(row, 1);
                String departmentPath = cellValue(row, 2);
                String phone = cellValue(row, 3);

                if (employeeNo.isBlank() || displayName.isBlank() || departmentPath.isBlank()) {
                    skippedRows.add(skipRow(rowNum, "必填字段缺失"));
                    continue;
                }
                if (!departmentsByPath.containsKey(departmentPath)) {
                    skippedRows.add(skipRow(rowNum, "ORG_INVALID_DEPARTMENT_PATH"));
                    continue;
                }
                // Accepted rows are added to these sets below, so they also catch duplicates
                // occurring within the uploaded file itself.
                if (seenEmployeeNos.contains(employeeNo)) {
                    skippedRows.add(skipRow(rowNum, "ORG_DUPLICATE_EMPLOYEE_NO"));
                    continue;
                }
                if (!phone.isBlank() && seenPhones.contains(phone)) {
                    skippedRows.add(skipRow(rowNum, "ORG_DUPLICATE_PHONE"));
                    continue;
                }

                String tempPassword = generateTemporaryPassword();
                Department department = departmentsByPath.get(departmentPath);
                Employee employee = new Employee();
                employee.setId(IdGenerator.newId("emp"));
                employee.setEmployeeNo(employeeNo);
                employee.setDisplayName(displayName);
                employee.setDepartmentId(department.getId());
                employee.setPhone(phone.isBlank() ? null : phone);
                employee.setPasswordHash(passwordEncoder.encode(tempPassword));
                employee.setStatus("active");
                employee.setAdmin(false);
                employee.setHasOutageDisposition(false);
                employee.setMustChangePassword(true);
                employee.setFailedLoginCount(0);
                newEmployees.add(employee);

                seenEmployeeNos.add(employeeNo);
                if (!phone.isBlank()) {
                    seenPhones.add(phone);
                }
                created.add(new CredentialRow(employeeNo, displayName, tempPassword));
            }
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "文件解析失败", 422);
        }

        employeeRepository.saveAll(newEmployees);
        for (Employee employee : newEmployees) {
            auditService.log("employee.create", "Employee", employee.getId(), null,
                    Map.of("employeeNo", employee.getEmployeeNo(), "source", "import"), null);
        }

        String credentialBatchId = null;
        if (!created.isEmpty()) {
            credentialBatchId = saveCredentialBatch(created);
        }

        return new EmployeeImportResponse(
                IdGenerator.newId("eib"),
                created.size(),
                skippedRows.size(),
                skippedRows,
                credentialBatchId
        );
    }

    private String saveCredentialBatch(List<CredentialRow> rows) {
        String batchId = IdGenerator.newId("ecb");
        String fileKey = "credentials/" + batchId + ".xlsx";
        fileStore.write(fileKey, out -> {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet = workbook.createSheet("credentials");
                Row header = sheet.createRow(0);
                header.createCell(0).setCellValue("employeeNo");
                header.createCell(1).setCellValue("displayName");
                header.createCell(2).setCellValue("temporaryPassword");
                int idx = 1;
                for (CredentialRow row : rows) {
                    Row r = sheet.createRow(idx++);
                    r.createCell(0).setCellValue(ExcelCellHelper.sanitize(row.employeeNo()));
                    r.createCell(1).setCellValue(ExcelCellHelper.sanitize(row.displayName()));
                    r.createCell(2).setCellValue(ExcelCellHelper.sanitize(row.temporaryPassword()));
                }
                workbook.write(out);
            }
        });

        EmployeeCredentialBatch batch = new EmployeeCredentialBatch();
        batch.setId(batchId);
        batch.setCreatedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        batch.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        batch.setFileKey(fileKey);
        credentialBatchRepository.save(batch);
        return batchId;
    }

    private boolean validateHeaders(Row headerRow) {
        for (int i = 0; i < HEADERS.length; i++) {
            if (!EXPECTED_HEADERS.contains(cellValue(headerRow, i))) {
                return false;
            }
        }
        return true;
    }

    private boolean isEmptyRow(Row row) {
        for (int i = 0; i < 4; i++) {
            if (!cellValue(row, i).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String cellValue(Row row, int index) {
        if (row.getCell(index) == null) {
            return "";
        }
        return dataFormatter.formatCellValue(row.getCell(index)).trim();
    }

    private Map<String, Object> skipRow(int row, String reason) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("row", row);
        entry.put("reason", reason);
        return entry;
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            password.append(TEMP_PASSWORD_CHARS.charAt(RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return password.toString();
    }

    private record CredentialRow(String employeeNo, String displayName, String temporaryPassword) {
    }
}
