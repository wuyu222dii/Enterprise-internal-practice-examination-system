package com.examsystem.modules.report;

import com.examsystem.common.JsonHelper;
import com.examsystem.common.storage.FileStore;
import com.examsystem.modules.exam.entity.Exam;
import com.examsystem.modules.exam.entity.ExamAssignment;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.entity.ExamPublishedVersion;
import com.examsystem.modules.exam.entity.ExamResult;
import com.examsystem.modules.exam.repository.ExamAssignmentRepository;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamPublishedVersionRepository;
import com.examsystem.modules.exam.repository.ExamRepository;
import com.examsystem.modules.exam.repository.ExamResultRepository;
import com.examsystem.modules.report.entity.ExportJob;
import com.examsystem.modules.report.repository.ExportJobRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ExportJobRunner {

    private static final Logger log = LoggerFactory.getLogger(ExportJobRunner.class);

    /** Rows fetched from the database per query. */
    private static final int PAGE_SIZE = 500;
    /** Rows kept in memory per sheet before being flushed to the temporary file. */
    private static final int SXSSF_WINDOW = 200;

    private static final String[] SUMMARY_HEADERS = {
            "员工姓名", "工号", "部门快照", "考试名称", "参与状态",
            "官方得分", "满分", "是否通过", "官方尝试序号",
            "开始时间", "提交时间", "有效答题用时(秒)",
            "有效尝试次数", "总尝试次数", "无有效成绩标识"
    };

    private static final String[] ATTEMPT_HEADERS = {
            "员工姓名", "工号", "部门快照", "考试名称", "尝试序号",
            "尝试状态", "是否有效", "是否官方尝试", "作废/终止原因",
            "开始时间", "到期时间", "提交时间", "提交原因",
            "平台故障补时(秒)", "有效答题用时(秒)"
    };

    private final ExportJobRepository exportJobRepository;
    private final ExamRepository examRepository;
    private final ExamPublishedVersionRepository publishedVersionRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamResultRepository resultRepository;
    private final FileStore fileStore;

    public ExportJobRunner(
            ExportJobRepository exportJobRepository,
            ExamRepository examRepository,
            ExamPublishedVersionRepository publishedVersionRepository,
            ExamAssignmentRepository assignmentRepository,
            ExamAttemptRepository attemptRepository,
            ExamResultRepository resultRepository,
            FileStore fileStore
    ) {
        this.exportJobRepository = exportJobRepository;
        this.examRepository = examRepository;
        this.publishedVersionRepository = publishedVersionRepository;
        this.assignmentRepository = assignmentRepository;
        this.attemptRepository = attemptRepository;
        this.resultRepository = resultRepository;
        this.fileStore = fileStore;
    }

    /**
     * Runs outside a surrounding transaction on purpose: a capacity-scale export streams tens of
     * thousands of rows and must not hold a database transaction open for minutes.
     */
    @Async
    public void runExport(String jobId) {
        ExportJob job = exportJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.warn("Export job {} disappeared before it could run", jobId);
            return;
        }
        String fileKey = "exports/" + job.getId() + ".xlsx";
        try {
            ExportContext context = loadContext(job.getExamId());
            fileStore.write(fileKey, out -> writeWorkbook(out, context));
            job.setFileKey(fileKey);
            job.setStatus("completed");
        } catch (Exception e) {
            log.warn("Export job {} failed", jobId, e);
            job.setStatus("failed");
        }
        exportJobRepository.save(job);
    }

    private ExportContext loadContext(String examId) {
        Exam exam = examRepository.findById(examId).orElse(null);
        String examTitle = exam != null ? exam.getTitle() : "";
        String publishedVersionId = exam != null ? exam.getPublishedVersionId() : null;

        BigDecimal passingScore = BigDecimal.ZERO;
        if (publishedVersionId != null) {
            ExamPublishedVersion version = publishedVersionRepository.findById(publishedVersionId).orElse(null);
            if (version != null) {
                Object configured = JsonHelper.toMap(version.getConfigJson()).get("passingScore");
                if (configured instanceof Number number) {
                    passingScore = BigDecimal.valueOf(number.doubleValue());
                } else if (configured != null) {
                    passingScore = new BigDecimal(String.valueOf(configured));
                }
            }
        }
        return new ExportContext(examId, examTitle, publishedVersionId, passingScore);
    }

    private void writeWorkbook(OutputStream out, ExportContext context) throws IOException {
        // First pass over the attempts determines each employee's official attempt, which the
        // detail sheet needs while it is being streamed.
        Map<String, EmployeeAggregate> aggregates = aggregateAttempts(context);
        Map<String, ExamAssignment> assignees = loadAssignees(context.publishedVersionId());

        SXSSFWorkbook workbook = new SXSSFWorkbook(SXSSF_WINDOW);
        try {
            Sheet summarySheet = workbook.createSheet("官方成绩汇总");
            writeHeader(summarySheet, SUMMARY_HEADERS);
            Sheet attemptSheet = workbook.createSheet("全部尝试明细");
            writeHeader(attemptSheet, ATTEMPT_HEADERS);

            writeSummarySheet(summarySheet, context, aggregates);
            writeAttemptSheet(attemptSheet, context, aggregates, assignees);

            workbook.write(out);
        } finally {
            try {
                workbook.close();
            } finally {
                workbook.dispose();
            }
        }
    }

    private Map<String, EmployeeAggregate> aggregateAttempts(ExportContext context) {
        Map<String, EmployeeAggregate> aggregates = new HashMap<>();
        forEachAttemptPage(context.examId(), (attempts, results) -> {
            for (ExamAttempt attempt : attempts) {
                aggregates
                        .computeIfAbsent(attempt.getEmployeeId(), key -> new EmployeeAggregate())
                        .accept(attempt, results.get(attempt.getId()));
            }
        });
        return aggregates;
    }

    private void writeSummarySheet(Sheet sheet, ExportContext context, Map<String, EmployeeAggregate> aggregates) {
        if (context.publishedVersionId() == null) {
            return;
        }
        int rowIndex = 1;
        int pageIndex = 0;
        Page<ExamAssignment> page;
        do {
            page = assignmentRepository.findByPublishedVersionIdOrderByEmployeeNoSnapshotAsc(
                    context.publishedVersionId(), PageRequest.of(pageIndex, PAGE_SIZE));
            for (ExamAssignment assignment : page.getContent()) {
                EmployeeAggregate aggregate = aggregates.get(assignment.getEmployeeId());
                Row row = sheet.createRow(rowIndex++);
                int column = 0;
                setText(row, column++, assignment.getDisplayNameSnapshot());
                setText(row, column++, assignment.getEmployeeNoSnapshot());
                setText(row, column++, assignment.getDepartmentPathSnapshot());
                setText(row, column++, context.examTitle());
                setText(row, column++, participationStatus(aggregate));

                ExamAttempt official = aggregate != null ? aggregate.officialAttempt() : null;
                ExamResult officialResult = aggregate != null ? aggregate.officialResult() : null;
                if (officialResult != null) {
                    setNumber(row, column++, officialResult.getTotalScore());
                    setNumber(row, column++, officialResult.getMaxScore());
                    setText(row, column++, officialResult.getTotalScore().compareTo(context.passingScore()) >= 0
                            ? "通过" : "未通过");
                } else {
                    // Requirement 16.3: never fabricate a zero score or a failed conclusion.
                    column += 3;
                }
                if (official != null) {
                    setNumber(row, column++, official.getAttemptNumber());
                    setText(row, column++, formatInstant(official.getStartedAt()));
                    setText(row, column++, formatInstant(official.getSubmittedAt()));
                    setNumber(row, column++, effectiveSeconds(official));
                } else {
                    column += 4;
                }
                setNumber(row, column++, aggregate != null ? aggregate.validAttempts() : 0);
                setNumber(row, column++, aggregate != null ? aggregate.totalAttempts() : 0);
                setText(row, column, noOfficialResultFlag(aggregate));
            }
            pageIndex++;
        } while (page.hasNext());
    }

    private void writeAttemptSheet(
            Sheet sheet,
            ExportContext context,
            Map<String, EmployeeAggregate> aggregates,
            Map<String, ExamAssignment> assignees
    ) {
        int[] rowIndex = {1};
        forEachAttemptPage(context.examId(), (attempts, results) -> {
            for (ExamAttempt attempt : attempts) {
                ExamAssignment assignment = assignees.get(attempt.getEmployeeId());
                EmployeeAggregate aggregate = aggregates.get(attempt.getEmployeeId());
                boolean official = aggregate != null
                        && aggregate.officialAttempt() != null
                        && aggregate.officialAttempt().getId().equals(attempt.getId());

                Row row = sheet.createRow(rowIndex[0]++);
                int column = 0;
                setText(row, column++, assignment != null ? assignment.getDisplayNameSnapshot() : "");
                setText(row, column++, assignment != null ? assignment.getEmployeeNoSnapshot() : "");
                setText(row, column++, assignment != null ? assignment.getDepartmentPathSnapshot() : "");
                setText(row, column++, context.examTitle());
                setNumber(row, column++, attempt.getAttemptNumber());
                setText(row, column++, attempt.getAttemptStatus());
                setText(row, column++, isValidAttempt(attempt) ? "是" : "否");
                setText(row, column++, official ? "是" : "否");
                setText(row, column++, attempt.getVoidReason() != null ? attempt.getVoidReason() : "");
                setText(row, column++, formatInstant(attempt.getStartedAt()));
                setText(row, column++, formatInstant(attempt.getExpiresAt()));
                setText(row, column++, formatInstant(attempt.getSubmittedAt()));
                setText(row, column++, attempt.getSubmitReason() != null ? attempt.getSubmitReason() : "");
                setNumber(row, column++, attempt.getCompensationSeconds());
                if (attempt.getSubmittedAt() != null) {
                    setNumber(row, column, effectiveSeconds(attempt));
                }
            }
        });
    }

    private Map<String, ExamAssignment> loadAssignees(String publishedVersionId) {
        if (publishedVersionId == null) {
            return Map.of();
        }
        Map<String, ExamAssignment> assignees = new HashMap<>();
        int pageIndex = 0;
        Page<ExamAssignment> page;
        do {
            page = assignmentRepository.findByPublishedVersionIdOrderByEmployeeNoSnapshotAsc(
                    publishedVersionId, PageRequest.of(pageIndex, PAGE_SIZE));
            for (ExamAssignment assignment : page.getContent()) {
                assignees.put(assignment.getEmployeeId(), assignment);
            }
            pageIndex++;
        } while (page.hasNext());
        return assignees;
    }

    private void forEachAttemptPage(String examId, AttemptPageConsumer consumer) {
        int pageIndex = 0;
        Page<ExamAttempt> page;
        do {
            page = attemptRepository.findByExamIdOrderByEmployeeIdAscAttemptNumberAsc(
                    examId, PageRequest.of(pageIndex, PAGE_SIZE));
            List<ExamAttempt> attempts = page.getContent();
            if (!attempts.isEmpty()) {
                consumer.accept(attempts, loadResults(attempts));
            }
            pageIndex++;
        } while (page.hasNext());
    }

    private Map<String, ExamResult> loadResults(List<ExamAttempt> attempts) {
        List<String> attemptIds = new ArrayList<>(attempts.size());
        for (ExamAttempt attempt : attempts) {
            attemptIds.add(attempt.getId());
        }
        Map<String, ExamResult> results = new HashMap<>();
        for (ExamResult result : resultRepository.findByExamAttemptIdIn(attemptIds)) {
            results.put(result.getExamAttemptId(), result);
        }
        return results;
    }

    private void writeHeader(Sheet sheet, String[] headers) {
        Row header = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            header.createCell(i).setCellValue(headers[i]);
        }
    }

    private void setText(Row row, int column, String value) {
        row.createCell(column).setCellValue(value != null ? value : "");
    }

    private void setNumber(Row row, int column, Number value) {
        row.createCell(column).setCellValue(value.doubleValue());
    }

    private String participationStatus(EmployeeAggregate aggregate) {
        if (aggregate == null || aggregate.totalAttempts() == 0) {
            return "缺考";
        }
        if (aggregate.officialResult() != null) {
            return "已完成";
        }
        return aggregate.hasInProgress() ? "进行中" : "无有效成绩";
    }

    private String noOfficialResultFlag(EmployeeAggregate aggregate) {
        if (aggregate == null || aggregate.totalAttempts() == 0) {
            return "缺考";
        }
        return aggregate.officialResult() == null ? "无有效成绩" : "";
    }

    private static boolean isValidAttempt(ExamAttempt attempt) {
        return !attempt.isVoided() && "completed".equals(attempt.getAttemptStatus());
    }

    private static long effectiveSeconds(ExamAttempt attempt) {
        Instant submittedAt = attempt.getSubmittedAt();
        if (submittedAt == null || attempt.getStartedAt() == null) {
            return 0;
        }
        long elapsed = Duration.between(attempt.getStartedAt(), submittedAt).getSeconds();
        // Platform-outage compensation extended the window but was not answering time.
        return Math.max(0, elapsed - attempt.getCompensationSeconds());
    }

    private static String formatInstant(Instant instant) {
        return instant != null ? instant.toString() : "";
    }

    @FunctionalInterface
    private interface AttemptPageConsumer {
        void accept(List<ExamAttempt> attempts, Map<String, ExamResult> results);
    }

    private record ExportContext(
            String examId,
            String examTitle,
            String publishedVersionId,
            BigDecimal passingScore
    ) {
    }

    /**
     * Per-employee rollup built during the first pass over the attempts. The official attempt is the
     * highest scoring valid attempt, and the earliest one when several reach that score.
     */
    private static final class EmployeeAggregate {
        private int totalAttempts;
        private int validAttempts;
        private boolean hasInProgress;
        private ExamAttempt officialAttempt;
        private ExamResult officialResult;

        void accept(ExamAttempt attempt, ExamResult result) {
            totalAttempts++;
            if ("inProgress".equals(attempt.getAttemptStatus()) || "submitting".equals(attempt.getAttemptStatus())) {
                hasInProgress = true;
            }
            if (!isValidAttempt(attempt) || result == null || !result.isOfficialValid()) {
                return;
            }
            validAttempts++;
            if (officialResult == null || isBetterOfficial(attempt, result)) {
                officialAttempt = attempt;
                officialResult = result;
            }
        }

        private boolean isBetterOfficial(ExamAttempt attempt, ExamResult result) {
            int scoreComparison = result.getTotalScore().compareTo(officialResult.getTotalScore());
            if (scoreComparison != 0) {
                return scoreComparison > 0;
            }
            Instant candidate = attempt.getSubmittedAt();
            Instant incumbent = officialAttempt.getSubmittedAt();
            if (candidate == null || incumbent == null) {
                return false;
            }
            return candidate.isBefore(incumbent);
        }

        int totalAttempts() {
            return totalAttempts;
        }

        int validAttempts() {
            return validAttempts;
        }

        boolean hasInProgress() {
            return hasInProgress;
        }

        ExamAttempt officialAttempt() {
            return officialAttempt;
        }

        ExamResult officialResult() {
            return officialResult;
        }
    }
}
