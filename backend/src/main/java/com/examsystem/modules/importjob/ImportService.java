package com.examsystem.modules.importjob;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.modules.importjob.entity.ImportTask;
import com.examsystem.modules.importjob.repository.ImportTaskRepository;
import com.examsystem.modules.question.QuestionService;
import com.examsystem.security.SecurityUtils;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ImportService {

    private final ImportTaskRepository importTaskRepository;
    private final QuestionService questionService;

    public ImportService(ImportTaskRepository importTaskRepository, QuestionService questionService) {
        this.importTaskRepository = importTaskRepository;
        this.questionService = questionService;
    }

    public byte[] downloadTemplate(String questionBankId) {
        SecurityUtils.requireAdmin();
        questionService.requireActiveBank(questionBankId);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("questions");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("type");
            header.createCell(1).setCellValue("stem");
            header.createCell(2).setCellValue("options");
            header.createCell(3).setCellValue("standardAnswer");
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
        ParseResult parseResult = parseExcel(file);

        ImportTask task = new ImportTask();
        task.setId(IdGenerator.newId("imp"));
        task.setQuestionBankId(questionBankId);
        task.setStatus("preview_ready");
        task.setFileKey(file.getOriginalFilename());
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
        Map<String, Object> preview = new HashMap<>();
        preview.put("taskId", task.getId());
        preview.put("status", task.getStatus());
        preview.put("confirmToken", task.getConfirmToken());
        preview.put("importableCount", task.getImportableCount());
        preview.put("errorCount", task.getErrorCount());
        preview.put("previewExpiresAt", Instant.now().plus(1, ChronoUnit.HOURS));
        preview.put("pendingHierarchy", Collections.emptyMap());
        return preview;
    }

    @Transactional
    public void confirm(String id, String confirmToken) {
        SecurityUtils.requireAdmin();
        ImportTask task = getTaskEntity(id);
        if (!confirmToken.equals(task.getConfirmToken())) {
            throw BusinessException.of(ErrorCode.IMP_PREVIEW_STALE, "确认令牌无效或已过期", 409);
        }
        task.setStatus("completed");
        task.setConfirmToken(null);
        importTaskRepository.save(task);
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

    private ParseResult parseExcel(MultipartFile file) {
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int rows = Math.max(0, sheet.getLastRowNum());
            Map<String, Object> preview = Map.of("rows", rows, "sample", List.of());
            return new ParseResult(rows, 0, preview);
        } catch (IOException e) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "Excel 解析失败", 422);
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

    private record ParseResult(int importableCount, int errorCount, Map<String, Object> preview) {
    }
}
