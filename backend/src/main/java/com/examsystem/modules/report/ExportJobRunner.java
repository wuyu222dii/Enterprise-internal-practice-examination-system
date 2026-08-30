package com.examsystem.modules.report;

import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamResultRepository;
import com.examsystem.modules.report.entity.ExportJob;
import com.examsystem.modules.report.repository.ExportJobRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Component
public class ExportJobRunner {

    private static final Logger log = LoggerFactory.getLogger(ExportJobRunner.class);
    private static final String[] HEADERS = {
            "attemptId", "employeeId", "attemptNumber", "attemptStatus", "totalScore", "maxScore"
    };

    private final ExportJobRepository exportJobRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamResultRepository resultRepository;
    private final ExportFileStore exportFileStore;

    public ExportJobRunner(
            ExportJobRepository exportJobRepository,
            ExamAttemptRepository attemptRepository,
            ExamResultRepository resultRepository,
            ExportFileStore exportFileStore
    ) {
        this.exportJobRepository = exportJobRepository;
        this.attemptRepository = attemptRepository;
        this.resultRepository = resultRepository;
        this.exportFileStore = exportFileStore;
    }

    @Async
    @Transactional
    public void runExport(String jobId) {
        ExportJob job = exportJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }
        try {
            byte[] content = buildWorkbook(job.getExamId());
            String fileKey = "exports/" + job.getId() + ".xlsx";
            exportFileStore.put(fileKey, content);
            job.setFileKey(fileKey);
            job.setStatus("completed");
            exportJobRepository.save(job);
        } catch (Exception e) {
            log.warn("Export job {} failed", jobId, e);
            job.setStatus("failed");
            exportJobRepository.save(job);
        }
    }

    private byte[] buildWorkbook(String examId) throws IOException {
        List<ExamAttempt> attempts = attemptRepository.findByExamId(examId);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("scores");
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                header.createCell(i).setCellValue(HEADERS[i]);
            }
            int rowIndex = 1;
            for (ExamAttempt attempt : attempts) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(attempt.getId());
                row.createCell(1).setCellValue(attempt.getEmployeeId());
                row.createCell(2).setCellValue(attempt.getAttemptNumber());
                row.createCell(3).setCellValue(attempt.getAttemptStatus());
                resultRepository.findByExamAttemptId(attempt.getId()).ifPresent(result -> {
                    row.createCell(4).setCellValue(result.getTotalScore().doubleValue());
                    row.createCell(5).setCellValue(result.getMaxScore().doubleValue());
                });
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
