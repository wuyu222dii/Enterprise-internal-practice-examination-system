package com.examsystem.modules.importjob;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.ExcelCellHelper;
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
import com.examsystem.modules.question.entity.QuestionVersion;
import com.examsystem.security.SecurityUtils;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ImportService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final String[] TEMPLATE_HEADERS = {
            "一级科目", "二级科目", "三级科目", "题型", "难易度", "题目内容", "正确答案", "答案选项数量", "试题类型"
    };
    private static final String[] TEMPLATE_HINTS = {
            "必填，一级目录。",
            "二级目录。没有可以为空,不能跨级录入",
            "三级目录。没有可以为空,不能跨级录入",
            "必填，只能填写“判断、单选、多选、解答题”其中之一，不能有空格",
            "必填，只能填写“易、中、难”或“简单、一般、困难”",
            "必填。单选/多选把题干和选项写在同一格，题干与选项、选项之间必须换行（Alt+Enter）；判断题只写题干；解答题只写题干，正确答案写参考答案",
            "必填。单选填 A；多选填 AC 或 A,C；判断填 对/错 或 正确/错误；解答题填参考答案",
            "选填，选项个数，用于校验",
            "选填，初培、复审，可同时填写“初培、复审”"
    };

    private static final int CONFIRM_TTL_DAYS = 30;
    private static final Set<String> CANCELLABLE = Set.of("preview_ready", "needs_revalidation");
    private static final Set<String> REVALIDATABLE = Set.of("preview_ready", "needs_revalidation", "expired");

    private final ImportTaskRepository importTaskRepository;
    private final QuestionService questionService;
    private final AuditService auditService;
    private final FileStore fileStore;

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
            Sheet sheet = workbook.createSheet("题库模板说明");
            CellStyle wrap = workbook.createCellStyle();
            wrap.setWrapText(true);
            Row header = sheet.createRow(0);
            Row hints = sheet.createRow(1);
            for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
                header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
                hints.createCell(i).setCellValue(TEMPLATE_HINTS[i]);
                hints.getCell(i).setCellStyle(wrap);
            }
            writeTemplateExample(sheet, 2, "企业主要负责人", "一般行业", "", "单选", "易",
                    "为了加强安全生产工作，防止和减少生产安全事故，保障人民群众生命和财产安全，促进经济社会持续健康发展，以上描述了（）的立法目的。\nA．《安全生产法》\nB．《矿山安全法》\nC．《道路交通安全法》\nD．《消防法》",
                    "A", "4", "初培、复审");
            writeTemplateExample(sheet, 3, "企业主要负责人", "一般行业", "", "多选", "中",
                    "生产经营单位必须执行依法制定的保障安全生产的（）标准。\nA．国家\nB．地方\nC．行业\nD．合同约定",
                    "AC", "4", "初培");
            writeTemplateExample(sheet, 4, "企业主要负责人", "一般行业", "", "判断", "易",
                    "生产经营单位必须依法参加工伤保险，为从业人员缴纳保险费。",
                    "对", "2", "初培、复审");
            writeTemplateExample(sheet, 5, "企业主要负责人", "一般行业", "", "解答题", "中",
                    "简述生产经营单位主要负责人的安全生产职责。",
                    "建立健全本单位安全生产责任制。",
                    "", "初培");
            sheet.setColumnWidth(5, 80 * 256);
            for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
                if (i != 5) {
                    sheet.setColumnWidth(i, 16 * 256);
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate template", e);
        }
    }

    public PageDto<Map<String, Object>> listTasks(int page, int pageSize, String questionBankId, String status) {
        SecurityUtils.requireAdmin();
        PageRequest pageable = PageRequest.of(page - 1, pageSize);
        String bank = blankToNull(questionBankId);
        String st = blankToNull(status);
        Page<ImportTask> result;
        if (bank != null && st != null) {
            result = importTaskRepository.findByQuestionBankIdAndStatusOrderByCreatedAtDesc(bank, st, pageable);
        } else if (bank != null) {
            result = importTaskRepository.findByQuestionBankIdOrderByCreatedAtDesc(bank, pageable);
        } else if (st != null) {
            result = importTaskRepository.findByStatusOrderByCreatedAtDesc(st, pageable);
        } else {
            result = importTaskRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return new PageDto<>(result.getContent().stream().map(this::toDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Map<String, Object> createTask(MultipartFile file, String questionBankId) {
        SecurityUtils.requireAdmin();
        questionService.requireActiveBank(questionBankId);
        if (file.getSize() > MAX_FILE_SIZE) {
            throw BusinessException.of(ErrorCode.IMP_FILE_TOO_LARGE, "文件超过 10MB 限制", 422);
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.IMP_FILE_INVALID, "无法读取上传文件", 422);
        }
        QuestionImportParser.ParseResult parseResult = QuestionImportParser.parse(new ByteArrayInputStream(bytes));

        ImportTask task = new ImportTask();
        task.setId(IdGenerator.newId("imp"));
        task.setQuestionBankId(questionBankId);
        task.setStatus("preview_ready");
        String storedKey = "imports/" + task.getId() + ".xlsx";
        fileStore.write(storedKey, out -> out.write(bytes));
        task.setFileKey(storedKey);
        task.setConfirmToken(UUID.randomUUID().toString().replace("-", ""));
        applyPreview(task, parseResult);
        task.setCreatedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        importTaskRepository.save(task);
        return toDto(task);
    }

    public Map<String, Object> getTask(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        expireIfStale(task);
        return toDto(task);
    }

    public Map<String, Object> getPreview(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        expireIfStale(task);
        Map<String, Object> preview = new HashMap<>(JsonHelper.toMap(task.getPreviewJson()));
        preview.put("taskId", task.getId());
        preview.put("status", task.getStatus());
        preview.put("confirmToken", "preview_ready".equals(task.getStatus()) ? task.getConfirmToken() : null);
        preview.put("importableCount", task.getImportableCount());
        preview.put("errorCount", task.getErrorCount());
        preview.put("totalCount", task.getImportableCount() + task.getErrorCount());
        if (!preview.containsKey("previewExpiresAt")) {
            preview.put("previewExpiresAt", Instant.now().plus(1, ChronoUnit.HOURS));
        }
        preview.put("pendingHierarchy", buildPendingHierarchy(task));
        return preview;
    }

    @Transactional
    public void confirm(String id, String confirmToken) {
        confirm(id, confirmToken, Collections.emptyMap());
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void confirm(String id, String confirmToken, Map<String, Object> hierarchyConfirm) {
        SecurityUtils.requireAdmin();
        ImportTask task = importTaskRepository.findByIdForUpdate(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "导题任务不存在", 404));
        expireIfStale(task);
        if ("expired".equals(task.getStatus())) {
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "任务已过期，不可确认", 409);
        }
        if (!"preview_ready".equals(task.getStatus())) {
            throw BusinessException.of(ErrorCode.IMP_TASK_NOT_CONFIRMED, "任务状态不允许确认", 409);
        }
        if (task.getConfirmToken() == null || !confirmToken.equals(task.getConfirmToken())) {
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "确认令牌无效或已过期", 409);
        }
        questionService.requireActiveBank(task.getQuestionBankId());

        Map<String, Object> originalPreview = JsonHelper.toMap(task.getPreviewJson());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> originalValid = (List<Map<String, Object>>) originalPreview.getOrDefault("validRows", List.of());
        List<String> originalIds = QuestionImportDeduper.rowIdentities(originalValid);

        Map<String, Object> working = JsonHelper.toMap(JsonHelper.toJson(originalPreview));
        List<QuestionVersion> bankVersions = questionService.findActiveVersionsByBank(task.getQuestionBankId());
        QuestionImportDeduper.apply(working, bankVersions);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recheckedValid = (List<Map<String, Object>>) working.getOrDefault("validRows", List.of());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recheckedErrors = (List<Map<String, Object>>) working.getOrDefault("errorRows", List.of());
        if (!originalIds.equals(QuestionImportDeduper.rowIdentities(recheckedValid))) {
            working.put("totalCount", recheckedValid.size() + recheckedErrors.size());
            task.setPreviewJson(JsonHelper.toJson(working));
            task.setImportableCount(recheckedValid.size());
            task.setErrorCount(recheckedErrors.size());
            task.setStatus("needs_revalidation");
            task.setConfirmToken(null);
            importTaskRepository.save(task);
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "题库或预览依据已变化，请重新校验", 409);
        }

        Map<String, Object> pending = buildPendingHierarchy(task);
        if (hasPendingHierarchy(pending) && !isHierarchyConfirmed(hierarchyConfirm)) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "存在未知分类或知识点，请确认后再导入", 422);
        }

        Map<String, String> categoryIds = new HashMap<>();
        Map<String, String> knowledgePointIds = new HashMap<>();
        String defaultCategoryId = null;
        List<CreateQuestionRequest> requests = new ArrayList<>(originalValid.size());
        for (Map<String, Object> row : originalValid) {
            String categoryName = blankToNull(row.get("categoryName"));
            String categoryId;
            if (categoryName == null) {
                if (defaultCategoryId == null) {
                    defaultCategoryId = questionService.getOrCreateDefaultCategory(task.getQuestionBankId());
                }
                categoryId = defaultCategoryId;
            } else {
                categoryId = categoryIds.computeIfAbsent(categoryName,
                        name -> questionService.getOrCreateCategory(task.getQuestionBankId(), name));
            }
            String knowledgePointName = blankToNull(row.get("knowledgePointName"));
            String knowledgePointId = null;
            if (knowledgePointName != null) {
                String kpKey = categoryId + "\n" + knowledgePointName;
                knowledgePointId = knowledgePointIds.computeIfAbsent(kpKey,
                        ignored -> questionService.getOrCreateKnowledgePoint(categoryId, knowledgePointName));
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> options = row.get("options") instanceof List<?> list
                    ? (List<Map<String, Object>>) list : List.of();
            List<String> standardAnswer = row.get("standardAnswer") instanceof List<?> list
                    ? list.stream().map(String::valueOf).toList() : List.of();
            QuestionVersionInput version = new QuestionVersionInput(
                    String.valueOf(row.get("type")),
                    String.valueOf(row.get("stem")),
                    options,
                    standardAnswer,
                    blankToNull(row.get("explanation")),
                    row.get("difficulty") != null ? String.valueOf(row.get("difficulty")) : "medium",
                    toScore(row.get("defaultScore"))
            );
            requests.add(new CreateQuestionRequest(categoryId, knowledgePointId, version));
        }
        questionService.createQuestions(task.getQuestionBankId(), requests);
        task.setStatus("completed");
        task.setConfirmToken(null);
        importTaskRepository.save(task);
        auditService.log(
                "import.confirm",
                "ImportTask",
                id,
                Map.of("status", "preview_ready"),
                Map.of("status", "completed", "importedCount", originalValid.size()),
                null
        );
    }

    @Transactional
    public void cancel(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        expireIfStale(task);
        if (!CANCELLABLE.contains(task.getStatus())) {
            throw BusinessException.of(ErrorCode.IMP_TASK_NOT_CONFIRMED, "当前状态不可取消", 409);
        }
        task.setStatus("cancelled");
        task.setConfirmToken(null);
        importTaskRepository.save(task);
    }

    @Transactional
    public void revalidate(String id) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        expireIfStale(task);
        if (!REVALIDATABLE.contains(task.getStatus())) {
            throw BusinessException.of(ErrorCode.IMP_TASK_NOT_CONFIRMED, "当前状态不可重新校验", 409);
        }
        if (task.getFileKey() == null || task.getFileKey().isBlank()) {
            throw BusinessException.of(ErrorCode.IMP_FILE_INVALID, "导入文件已清理，无法重新校验", 422);
        }
        Resource resource = fileStore.read(task.getFileKey())
                .orElseThrow(() -> BusinessException.of(ErrorCode.IMP_FILE_INVALID, "导入文件不存在，无法重新校验", 422));
        QuestionImportParser.ParseResult parseResult;
        try (InputStream inputStream = resource.getInputStream()) {
            parseResult = QuestionImportParser.parse(inputStream);
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.IMP_FILE_INVALID, "无法读取导入文件", 422);
        }
        questionService.requireActiveBank(task.getQuestionBankId());
        applyPreview(task, parseResult);
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
            header.createCell(0).setCellValue("sheetName");
            header.createCell(1).setCellValue("rowNum");
            header.createCell(2).setCellValue("errorType");
            header.createCell(3).setCellValue("field");
            header.createCell(4).setCellValue("stemSummary");
            header.createCell(5).setCellValue("message");
            int rowIdx = 1;
            for (Map<String, Object> error : errorRows) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(ExcelCellHelper.sanitize(stringOrEmpty(error.get("sheetName"))));
                row.createCell(1).setCellValue(error.get("rowNum") instanceof Number n ? n.intValue() : 0);
                row.createCell(2).setCellValue(ExcelCellHelper.sanitize(stringOrEmpty(error.get("errorType"))));
                row.createCell(3).setCellValue(ExcelCellHelper.sanitize(stringOrEmpty(error.get("field"))));
                row.createCell(4).setCellValue(ExcelCellHelper.sanitize(stringOrEmpty(error.get("stemSummary"))));
                row.createCell(5).setCellValue(ExcelCellHelper.sanitize(stringOrEmpty(error.get("message"))));
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to generate error report", e);
        }
    }

    private void applyPreview(ImportTask task, QuestionImportParser.ParseResult parseResult) {
        Map<String, Object> preview = new LinkedHashMap<>(parseResult.preview());
        QuestionImportDeduper.apply(preview, questionService.findActiveVersionsByBank(task.getQuestionBankId()));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> validRows = (List<Map<String, Object>>) preview.getOrDefault("validRows", List.of());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> errorRows = (List<Map<String, Object>>) preview.getOrDefault("errorRows", List.of());
        preview.put("totalCount", validRows.size() + errorRows.size());
        preview.put("previewExpiresAt", Instant.now().plus(1, ChronoUnit.HOURS));
        task.setImportableCount(validRows.size());
        task.setErrorCount(errorRows.size());
        task.setPreviewJson(JsonHelper.toJson(preview));
    }

    private void writeTemplateExample(
            Sheet sheet,
            int rowIndex,
            String level1,
            String level2,
            String level3,
            String type,
            String difficulty,
            String content,
            String answer,
            String optionCount,
            String examKind
    ) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(level1);
        row.createCell(1).setCellValue(level2);
        row.createCell(2).setCellValue(level3);
        row.createCell(3).setCellValue(type);
        row.createCell(4).setCellValue(difficulty);
        row.createCell(5).setCellValue(content);
        row.createCell(6).setCellValue(answer);
        row.createCell(7).setCellValue(optionCount);
        row.createCell(8).setCellValue(examKind);
        row.setHeightInPoints(72);
    }

    private void expireIfStale(ImportTask task) {
        if (task.getCreatedAt() != null
                && CANCELLABLE.contains(task.getStatus())
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
        dto.put("totalCount", task.getImportableCount() + task.getErrorCount());
        dto.put("createdAt", task.getCreatedAt());
        dto.put("confirmAllowed", "preview_ready".equals(task.getStatus()) && task.getConfirmToken() != null);
        return dto;
    }

    private Map<String, Object> buildPendingHierarchy(ImportTask task) {
        Map<String, Object> preview = JsonHelper.toMap(task.getPreviewJson());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> validRows = (List<Map<String, Object>>) preview.getOrDefault("validRows", List.of());
        Set<String> categories = new LinkedHashSet<>();
        List<Map<String, String>> knowledgePoints = new ArrayList<>();
        Set<String> seenKp = new LinkedHashSet<>();
        for (Map<String, Object> row : validRows) {
            String categoryName = blankToNull(row.get("categoryName"));
            if (categoryName != null && !questionService.categoryExists(task.getQuestionBankId(), categoryName)) {
                categories.add(categoryName);
            }
            String knowledgePointName = blankToNull(row.get("knowledgePointName"));
            if (categoryName != null && knowledgePointName != null) {
                String key = categoryName + "\n" + knowledgePointName;
                if (seenKp.add(key) && !questionService.knowledgePointExists(
                        task.getQuestionBankId(), categoryName, knowledgePointName)) {
                    Map<String, String> item = new LinkedHashMap<>();
                    item.put("category", categoryName);
                    item.put("name", knowledgePointName);
                    knowledgePoints.add(item);
                }
            }
        }
        Map<String, Object> pending = new LinkedHashMap<>();
        if (!categories.isEmpty()) {
            pending.put("categories", new ArrayList<>(categories));
        }
        if (!knowledgePoints.isEmpty()) {
            pending.put("knowledgePoints", knowledgePoints);
        }
        return pending;
    }

    private static boolean hasPendingHierarchy(Map<String, Object> pending) {
        if (pending == null || pending.isEmpty()) {
            return false;
        }
        Object categories = pending.get("categories");
        Object knowledgePoints = pending.get("knowledgePoints");
        boolean hasCategories = categories instanceof List<?> list && !list.isEmpty();
        boolean hasKnowledgePoints = knowledgePoints instanceof List<?> list && !list.isEmpty();
        return hasCategories || hasKnowledgePoints;
    }

    private static boolean isHierarchyConfirmed(Map<String, Object> confirm) {
        if (confirm == null || confirm.isEmpty()) {
            return false;
        }
        if (Boolean.TRUE.equals(confirm.get("confirmPendingHierarchy"))) {
            return true;
        }
        Object confirmed = confirm.get("confirmed");
        if (Boolean.TRUE.equals(confirmed) || "true".equalsIgnoreCase(String.valueOf(confirmed))) {
            return true;
        }
        return confirm.containsKey("categoryName");
    }

    private static String blankToNull(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() || "null".equals(text) ? null : text;
    }

    private static String stringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static BigDecimal toScore(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
