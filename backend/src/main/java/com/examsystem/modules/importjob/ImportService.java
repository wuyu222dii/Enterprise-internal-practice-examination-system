package com.examsystem.modules.importjob;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.common.storage.FileStore;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.importjob.entity.ImportTask;
import com.examsystem.modules.importjob.repository.ImportTaskRepository;
import com.examsystem.modules.question.QuestionService;
import com.examsystem.modules.question.dto.CreateQuestionRequest;
import com.examsystem.modules.question.dto.QuestionVersionInput;
import com.examsystem.security.SecurityUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ImportService {

    private static final int MAX_ROWS = 1000;
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> VALID_TYPES = Set.of("singleChoice", "multipleChoice", "trueFalse", "essay");
    private static final Set<String> VALID_DIFFICULTIES = Set.of("easy", "medium", "hard");
    private static final String[] TEMPLATE_HEADERS = {"type", "stem", "options", "standardAnswer", "difficulty"};

    private static final int CONFIRM_TTL_DAYS = 30;

    private final ImportTaskRepository importTaskRepository;
    private final QuestionService questionService;
    private final AuditService auditService;
    private final FileStore fileStore;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ImportService(
            ImportTaskRepository importTaskRepository,
            QuestionService questionService,
            AuditService auditService,
            FileStore fileStore
    ) {
        this.importTaskRepository = importTaskRepository;
        this.questionService = questionService;
        this.auditService = auditService;
        this.fileStore = fileStore;
    }

    public byte[] downloadTemplate(String questionBankId) {
        SecurityUtils.requireAdmin();
        questionService.requireActiveBank(questionBankId);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("questions");
            Row header = sheet.createRow(0);
            for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
                header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate template", e);
        }
    }

    public PageDto<Map<String, Object>> listTasks(int page, int pageSize) {
        SecurityUtils.requireAdmin();
        Page<ImportTask> result = importTaskRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::toDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Map<String, Object> createTask(MultipartFile file, String questionBankId) {
        SecurityUtils.requireAdmin();
        questionService.requireActiveBank(questionBankId);
        if (file.getSize() > MAX_FILE_SIZE) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "文件超过 10MB 限制", 422);
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "无法读取上传文件", 422);
        }
        ParseResult parseResult = parseExcel(new ByteArrayInputStream(bytes));

        ImportTask task = new ImportTask();
        task.setId(IdGenerator.newId("imp"));
        task.setQuestionBankId(questionBankId);
        task.setStatus("preview_ready");
        String storedKey = "imports/" + task.getId() + ".xlsx";
        fileStore.write(storedKey, out -> out.write(bytes));
        task.setFileKey(storedKey);
        task.setConfirmToken(UUID.randomUUID().toString().replace("-", ""));
        task.setImportableCount(parseResult.importableCount());
        task.setErrorCount(parseResult.errorCount());
        task.setPreviewJson(JsonHelper.toJson(parseResult.preview()));
        task.setCreatedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        importTaskRepository.save(task);
        return toDto(task);
    }

    public Map<String, Object> getTask(String id) {
        SecurityUtils.requireAdmin();
        return toDto(getTaskEntity(id));
    }

    public Map<String, Object> getPreview(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        Map<String, Object> preview = new HashMap<>(JsonHelper.toMap(task.getPreviewJson()));
        preview.put("taskId", task.getId());
        preview.put("status", task.getStatus());
        preview.put("confirmToken", task.getConfirmToken());
        preview.put("importableCount", task.getImportableCount());
        preview.put("errorCount", task.getErrorCount());
        preview.put("previewExpiresAt", Instant.now().plus(1, ChronoUnit.HOURS));
        preview.put("pendingHierarchy", buildPendingHierarchy(task));
        return preview;
    }

    @Transactional
    public void confirm(String id, String confirmToken) {
        confirm(id, confirmToken, Collections.emptyMap());
    }

    @Transactional
    public void confirm(String id, String confirmToken, Map<String, Object> hierarchyConfirm) {
        SecurityUtils.requireAdmin();
        ImportTask task = importTaskRepository.findByIdForUpdate(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "导题任务不存在", 404));
        expireIfStale(task);
        if ("expired".equals(task.getStatus())) {
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "任务已过期，不可确认", 409);
        }
        if (!"preview_ready".equals(task.getStatus())) {
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "任务状态不允许确认", 409);
        }
        if (task.getConfirmToken() == null || !confirmToken.equals(task.getConfirmToken())) {
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "确认令牌无效或已过期", 409);
        }
        Map<String, Object> preview = JsonHelper.toMap(task.getPreviewJson());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> validRows = (List<Map<String, Object>>) preview.getOrDefault("validRows", List.of());
        String categoryId = questionService.getOrCreateDefaultCategory(task.getQuestionBankId());
        if (hierarchyConfirm != null && !hierarchyConfirm.isEmpty()) {
            categoryId = resolveCategoryFromConfirm(task.getQuestionBankId(), hierarchyConfirm, categoryId);
        }
        for (Map<String, Object> row : validRows) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> options = (List<Map<String, Object>>) row.get("options");
            @SuppressWarnings("unchecked")
            List<String> standardAnswer = ((List<?>) row.get("standardAnswer")).stream()
                    .map(String::valueOf).toList();
            QuestionVersionInput version = new QuestionVersionInput(
                    String.valueOf(row.get("type")),
                    String.valueOf(row.get("stem")),
                    options,
                    standardAnswer,
                    null,
                    row.get("difficulty") != null ? String.valueOf(row.get("difficulty")) : "medium",
                    null
            );
            questionService.createQuestion(task.getQuestionBankId(), new CreateQuestionRequest(categoryId, null, version));
        }
        task.setStatus("completed");
        task.setConfirmToken(null);
        importTaskRepository.save(task);
        auditService.log(
                "import.confirm",
                "ImportTask",
                id,
                Map.of("status", "preview_ready"),
                Map.of("status", "completed", "importedCount", validRows.size()),
                null
        );
    }

    @Transactional
    public void cancel(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        task.setStatus("cancelled");
        importTaskRepository.save(task);
    }

    @Transactional
    public void revalidate(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        task.setStatus("preview_ready");
        task.setConfirmToken(UUID.randomUUID().toString().replace("-", ""));
        importTaskRepository.save(task);
    }

    public byte[] downloadErrors(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        Map<String, Object> preview = JsonHelper.toMap(task.getPreviewJson());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> errorRows = (List<Map<String, Object>>) preview.getOrDefault("errorRows", List.of());
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("errors");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("rowNum");
            header.createCell(1).setCellValue("message");
            int rowIdx = 1;
            for (Map<String, Object> error : errorRows) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(((Number) error.get("rowNum")).intValue());
                row.createCell(1).setCellValue(String.valueOf(error.get("message")));
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate error report", e);
        }
    }

    private ParseResult parseExcel(InputStream inputStream) {
        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getPhysicalNumberOfRows() == 0) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "Excel 文件为空", 422);
            }
            Row headerRow = sheet.getRow(0);
            validateHeader(headerRow);

            List<Map<String, Object>> validRows = new ArrayList<>();
            List<Map<String, Object>> errorRows = new ArrayList<>();
            int dataRowCount = 0;

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isEmptyRow(row)) {
                    continue;
                }
                dataRowCount++;
                if (dataRowCount > MAX_ROWS) {
                    throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "超过 1000 行数据限制", 422);
                }
                int rowNum = i + 1;
                String type = cellValue(row, 0);
                String stem = cellValue(row, 1);
                String optionsRaw = cellValue(row, 2);
                String standardAnswerRaw = cellValue(row, 3);
                String difficulty = cellValue(row, 4);

                List<String> errors = validateRow(type, stem, optionsRaw, standardAnswerRaw, difficulty);
                if (!errors.isEmpty()) {
                    Map<String, Object> errorRow = new HashMap<>();
                    errorRow.put("rowNum", rowNum);
                    errorRow.put("message", String.join("; ", errors));
                    errorRows.add(errorRow);
                    continue;
                }

                Map<String, Object> validRow = new HashMap<>();
                validRow.put("rowNum", rowNum);
                validRow.put("type", type.trim());
                validRow.put("stem", stem.trim());
                validRow.put("options", optionsRaw.isBlank() ? List.of() : JsonHelper.parse(optionsRaw.trim()));
                validRow.put("standardAnswer", JsonHelper.parse(standardAnswerRaw.trim()));
                validRow.put("difficulty", difficulty.isBlank() ? "medium" : difficulty.trim());
                validRows.add(validRow);
            }

            Map<String, Object> preview = new HashMap<>();
            preview.put("validRows", validRows);
            preview.put("errorRows", errorRows);
            return new ParseResult(validRows.size(), errorRows.size(), preview);
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "Excel 解析失败", 422);
        }
    }

    private void validateHeader(Row headerRow) {
        if (headerRow == null) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "缺少表头行", 422);
        }
        for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
            String expected = TEMPLATE_HEADERS[i];
            String actual = cellValue(headerRow, i).trim();
            if (!expected.equalsIgnoreCase(actual)) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR,
                        "表头第 " + (i + 1) + " 列应为 " + expected + "，实际为 " + actual, 422);
            }
        }
    }

    private List<String> validateRow(String type, String stem, String optionsRaw, String standardAnswerRaw, String difficulty) {
        List<String> errors = new ArrayList<>();
        if (type.isBlank()) {
            errors.add("type 不能为空");
        } else if (!VALID_TYPES.contains(type.trim())) {
            errors.add("type 无效，应为 singleChoice/multipleChoice/trueFalse/essay");
        }
        if (stem.isBlank()) {
            errors.add("stem 不能为空");
        }
        boolean essay = "essay".equals(type.trim());
        if (optionsRaw.isBlank()) {
            if (!essay) {
                errors.add("options 不能为空");
            }
        } else {
            try {
                Object parsed = JsonHelper.parse(optionsRaw.trim());
                if (!(parsed instanceof List<?> list) || (!essay && list.isEmpty())) {
                    errors.add(essay ? "options 必须为 JSON 数组" : "options 必须为非空 JSON 数组");
                }
            } catch (Exception e) {
                errors.add("options 不是合法 JSON 数组");
            }
        }
        if (standardAnswerRaw.isBlank()) {
            errors.add("standardAnswer 不能为空");
        } else {
            try {
                Object parsed = JsonHelper.parse(standardAnswerRaw.trim());
                if (!(parsed instanceof List<?> list) || list.isEmpty()) {
                    errors.add("standardAnswer 必须为非空 JSON 数组");
                }
            } catch (Exception e) {
                errors.add("standardAnswer 不是合法 JSON 数组");
            }
        }
        if (!difficulty.isBlank() && !VALID_DIFFICULTIES.contains(difficulty.trim())) {
            errors.add("difficulty 无效，应为 easy/medium/hard");
        }
        return errors;
    }

    private boolean isEmptyRow(Row row) {
        for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
            if (!cellValue(row, i).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String cellValue(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) {
            return "";
        }
        return dataFormatter.formatCellValue(cell).trim();
    }

    private void expireIfStale(ImportTask task) {
        if (task.getCreatedAt() != null
                && "preview_ready".equals(task.getStatus())
                && task.getCreatedAt().isBefore(Instant.now().minus(CONFIRM_TTL_DAYS, ChronoUnit.DAYS))) {
            task.setStatus("expired");
            task.setConfirmToken(null);
            importTaskRepository.save(task);
        }
    }

    private ImportTask getTaskEntity(String id) {
        return importTaskRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "导题任务不存在", 404));
    }

    private Map<String, Object> toDto(ImportTask task) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", task.getId());
        dto.put("questionBankId", task.getQuestionBankId());
        dto.put("status", task.getStatus());
        dto.put("importableCount", task.getImportableCount());
        dto.put("errorCount", task.getErrorCount());
        dto.put("createdAt", task.getCreatedAt());
        return dto;
    }

    private Map<String, Object> buildPendingHierarchy(ImportTask task) {
        Map<String, Object> preview = JsonHelper.toMap(task.getPreviewJson());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> validRows = (List<Map<String, Object>>) preview.getOrDefault("validRows", List.of());
        Map<String, Object> pending = new HashMap<>();
        List<String> categories = validRows.stream()
                .map(row -> row.get("categoryName"))
                .filter(v -> v != null && !String.valueOf(v).isBlank())
                .map(String::valueOf)
                .distinct()
                .filter(name -> !questionService.categoryExists(task.getQuestionBankId(), name))
                .toList();
        if (!categories.isEmpty()) {
            pending.put("categories", categories);
        }
        return pending;
    }

    private String resolveCategoryFromConfirm(String bankId, Map<String, Object> confirm, String defaultCategoryId) {
        if (confirm.containsKey("categoryName")) {
            return questionService.getOrCreateCategory(bankId, String.valueOf(confirm.get("categoryName")));
        }
        return defaultCategoryId;
    }

    private record ParseResult(int importableCount, int errorCount, Map<String, Object> preview) {
    }
}
