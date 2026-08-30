package com.examsystem.modules.exam;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.common.PaperHelper;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.exam.dto.SaveAnswerRequest;
import com.examsystem.modules.exam.dto.SaveAnswerResponse;
import com.examsystem.modules.exam.entity.Exam;
import com.examsystem.modules.exam.entity.ExamAnswer;
import com.examsystem.modules.exam.entity.ExamAssignment;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.entity.ExamPaperItem;
import com.examsystem.modules.exam.entity.ExamPublishedVersion;
import com.examsystem.modules.exam.entity.ExamResult;
import com.examsystem.modules.exam.entity.ExamRuleLine;
import com.examsystem.modules.exam.repository.ExamAnswerRepository;
import com.examsystem.modules.exam.repository.ExamAssignmentRepository;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamPaperItemRepository;
import com.examsystem.modules.exam.repository.ExamPublishedVersionRepository;
import com.examsystem.modules.exam.repository.ExamRepository;
import com.examsystem.modules.exam.repository.ExamResultRepository;
import com.examsystem.modules.exam.repository.ExamRuleLineRepository;
import com.examsystem.modules.organization.entity.Department;
import com.examsystem.modules.organization.entity.Employee;
import com.examsystem.modules.organization.repository.DepartmentRepository;
import com.examsystem.modules.organization.repository.EmployeeRepository;
import com.examsystem.modules.question.QuestionService;
import com.examsystem.modules.question.entity.QuestionVersion;
import com.examsystem.modules.scoring.ScoringService;
import com.examsystem.security.SecurityUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ExamService {

    private static final int BATCH_SIZE = 500;

    private final ExamRepository examRepository;
    private final ExamPublishedVersionRepository publishedVersionRepository;
    private final ExamRuleLineRepository ruleLineRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamPaperItemRepository paperItemRepository;
    private final ExamAnswerRepository answerRepository;
    private final ExamResultRepository resultRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final QuestionService questionService;
    private final ScoringService scoringService;
    private final AuditService auditService;

    public ExamService(
            ExamRepository examRepository,
            ExamPublishedVersionRepository publishedVersionRepository,
            ExamRuleLineRepository ruleLineRepository,
            ExamAssignmentRepository assignmentRepository,
            ExamAttemptRepository attemptRepository,
            ExamPaperItemRepository paperItemRepository,
            ExamAnswerRepository answerRepository,
            ExamResultRepository resultRepository,
            EmployeeRepository employeeRepository,
            DepartmentRepository departmentRepository,
            QuestionService questionService,
            ScoringService scoringService,
            AuditService auditService
    ) {
        this.examRepository = examRepository;
        this.publishedVersionRepository = publishedVersionRepository;
        this.ruleLineRepository = ruleLineRepository;
        this.assignmentRepository = assignmentRepository;
        this.attemptRepository = attemptRepository;
        this.paperItemRepository = paperItemRepository;
        this.answerRepository = answerRepository;
        this.resultRepository = resultRepository;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.questionService = questionService;
        this.scoringService = scoringService;
        this.auditService = auditService;
    }

    public PageDto<Map<String, Object>> listAdminExams(int page, int pageSize) {
        SecurityUtils.requireAdmin();
        Page<Exam> result = examRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::examToDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Map<String, Object> createExam(Map<String, Object> body) {
        SecurityUtils.requireAdmin();
        Exam exam = new Exam();
        exam.setId(IdGenerator.newId("exm"));
        exam.setTitle(body.getOrDefault("title", "未命名考试").toString());
        exam.setDescription(body.containsKey("description") ? String.valueOf(body.get("description")) : null);
        exam.setResultLocked(false);
        exam.setWizardConfig("{}");
        exam.setCreatedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        examRepository.save(exam);
        return examToDto(exam);
    }

    public Map<String, Object> getAdminExam(String id) {
        SecurityUtils.requireAdmin();
        return examToDto(getExam(id));
    }

    @Transactional
    public void patchExam(String id, Map<String, Object> body) {
        SecurityUtils.requireAdmin();
        Exam exam = getExam(id);
        if (body.containsKey("title")) {
            exam.setTitle(String.valueOf(body.get("title")));
        }
        if (body.containsKey("description")) {
            exam.setDescription(String.valueOf(body.get("description")));
        }
        examRepository.save(exam);
    }

    @Transactional
    public void updateWizardStep(String id, String step, Map<String, Object> body) {
        SecurityUtils.requireAdmin();
        Exam exam = getExam(id);
        if (!"draft".equals(exam.getLifecycle())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "仅草稿状态可编辑向导", 422);
        }

        Map<String, Object> config = new LinkedHashMap<>(JsonHelper.toMap(exam.getWizardConfig()));
        String normalizedStep = normalizeWizardStep(step);
        switch (normalizedStep) {
            case "basic" -> {
                applyBasicWizardData(exam, body);
                config.put("basic", body);
            }
            case "rules" -> config.put("rules", body);
            case "assignments" -> config.put("assignments", body);
            case "resultPolicy" -> config.put("resultPolicy", body);
            case "review" -> config.put("review", body);
            default -> throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "未知向导步骤: " + step, 422);
        }

        exam.setWizardConfig(JsonHelper.toJson(config));
        examRepository.save(exam);
    }

    public Map<String, Object> preflight(String id) {
        SecurityUtils.requireAdmin();
        Exam exam = getExam(id);
        List<Map<String, Object>> issues = new ArrayList<>();

        if (exam.getTitle() == null || exam.getTitle().isBlank() || "未命名考试".equals(exam.getTitle())) {
            issues.add(issue("EXM_MISSING_TITLE", "缺少考试标题"));
        }
        if (exam.getOpenStartAt() == null) {
            issues.add(issue("EXM_MISSING_OPEN_WINDOW", "未设置开放开始时间"));
        }

        Map<String, Object> config = JsonHelper.toMap(exam.getWizardConfig());
        Map<String, Object> rules = section(config, "rules");
        List<Map<String, Object>> ruleLines = mapList(rules.get("ruleLines"));
        if (ruleLines.isEmpty()) {
            issues.add(issue("EXM_MISSING_RULES", "未配置组卷规则"));
        } else {
            // 50 rule lines usually target the same bank and type; without this cache the candidate
            // pool would be re-read once per line (requirement 17.2 allows 30s for the whole check).
            Map<String, List<String>> poolCache = new HashMap<>();
            for (int i = 0; i < ruleLines.size(); i++) {
                Map<String, Object> line = ruleLines.get(i);
                String bankId = stringValue(line.get("bankId"));
                if (bankId == null || bankId.isBlank()) {
                    issues.add(issue("EXM_MISSING_BANK", "规则行 " + (i + 1) + " 未选择题库", i));
                    continue;
                }
                String type = stringValue(line.get("type"));
                int drawCount = intValue(line.get("drawCount"), 0);
                if (drawCount <= 0) {
                    issues.add(issue("EXM_INVALID_DRAW_COUNT", "规则行 " + (i + 1) + " 抽题数量无效", i));
                    continue;
                }
                List<String> pool = candidateVersionIds(poolCache, bankId, type);
                if (pool.size() < drawCount) {
                    Map<String, Object> poolIssue = issue("EXM_INSUFFICIENT_POOL",
                            "规则行 " + (i + 1) + " 题池不足", i);
                    poolIssue.put("required", drawCount);
                    poolIssue.put("available", pool.size());
                    issues.add(poolIssue);
                }
            }
        }

        Map<String, Object> assignments = section(config, "assignments");
        if (assignments.isEmpty()) {
            issues.add(issue("EXM_MISSING_ASSIGNMENTS", "未配置应考人员"));
        } else {
            long assigneeCount = countPlannedAssignees(assignments);
            if (assigneeCount == 0) {
                issues.add(issue("EXM_EMPTY_ASSIGNMENTS", "应考人员为空"));
            }
        }

        boolean ready = issues.isEmpty();
        Map<String, Object> result = new HashMap<>();
        result.put("examId", id);
        result.put("ready", ready);
        result.put("passed", ready);
        result.put("issues", issues);
        return result;
    }

    @Transactional
    public void publishExam(String id) {
        SecurityUtils.requireAdmin();
        Map<String, Object> check = preflight(id);
        if (!(boolean) check.get("ready")) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "发布预检未通过", 422);
        }

        Exam exam = getExam(id);
        if (!"draft".equals(exam.getLifecycle())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "仅草稿状态可发布", 422);
        }

        Map<String, Object> config = JsonHelper.toMap(exam.getWizardConfig());
        Map<String, Object> rules = section(config, "rules");
        int durationMinutes = intValue(rules.get("durationMinutes"), 60);
        int maxAttempts = intValue(rules.get("maxAttempts"), 1);
        BigDecimal passingScore = decimalValue(rules.get("passingScore"), BigDecimal.ZERO);

        int versionNo = publishedVersionRepository.findTopByExamIdOrderByVersionNoDesc(id)
                .map(v -> v.getVersionNo() + 1).orElse(1);

        Map<String, Object> publishConfig = new LinkedHashMap<>();
        publishConfig.put("durationMinutes", durationMinutes);
        publishConfig.put("maxAttempts", maxAttempts);
        publishConfig.put("passingScore", passingScore);
        if (config.containsKey("resultPolicy")) {
            publishConfig.put("resultPolicy", config.get("resultPolicy"));
        }

        ExamPublishedVersion version = new ExamPublishedVersion();
        version.setId(IdGenerator.newId("epv"));
        version.setExamId(id);
        version.setVersionNo(versionNo);
        version.setConfigJson(JsonHelper.toJson(publishConfig));
        version.setPublishedAt(Instant.now());
        publishedVersionRepository.save(version);

        List<Map<String, Object>> ruleLines = mapList(rules.get("ruleLines"));
        List<ExamRuleLine> ruleLineEntities = new ArrayList<>(ruleLines.size());
        int lineOrder = 1;
        for (Map<String, Object> line : ruleLines) {
            ExamRuleLine ruleLine = new ExamRuleLine();
            ruleLine.setId(IdGenerator.newId("erl"));
            ruleLine.setPublishedVersionId(version.getId());
            ruleLine.setLineOrder(lineOrder++);
            Map<String, Object> filter = new LinkedHashMap<>();
            filter.put("bankId", line.get("bankId"));
            if (line.containsKey("type")) {
                filter.put("type", line.get("type"));
            }
            ruleLine.setFilterJson(JsonHelper.toJson(filter));
            ruleLine.setDrawCount(intValue(line.get("drawCount"), 1));
            ruleLine.setScorePerQuestion(decimalValue(line.get("scorePerQuestion"), BigDecimal.ONE));
            ruleLineEntities.add(ruleLine);
        }
        ruleLineRepository.saveAll(ruleLineEntities);

        createAssignments(version.getId(), section(config, "assignments"));

        exam.setPublishedVersionId(version.getId());
        exam.setLifecycle("openForAttempt");
        if (exam.getOpenStartAt() == null) {
            exam.setOpenStartAt(Instant.now());
        }
        examRepository.save(exam);
        auditService.log(
                "exam.publish",
                "Exam",
                id,
                Map.of("lifecycle", "draft"),
                Map.of("lifecycle", exam.getLifecycle(), "publishedVersionId", version.getId()),
                null
        );
    }

    @Transactional
    public void cancelExam(String id, String employeeVisibleReason, String internalReason) {
        SecurityUtils.requireAdmin();
        Exam exam = getExam(id);
        exam.setLifecycle("cancelled");
        examRepository.save(exam);
        auditService.log(
                "exam.cancel",
                "Exam",
                id,
                Map.of("lifecycle", "openForAttempt"),
                Map.of("lifecycle", "cancelled", "reason", internalReason != null ? internalReason : ""),
                internalReason
        );
    }

    public Map<String, Object> getMonitor(String id) {
        SecurityUtils.requireAdmin();
        return Map.of("examId", id, "attemptCount", attemptRepository.countByExamId(id));
    }

    public List<Map<String, Object>> listExamTasks() {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        List<ExamAssignment> assignments = assignmentRepository.findByEmployeeId(employeeId);
        if (assignments.isEmpty()) {
            return List.of();
        }

        Set<String> versionIds = assignments.stream()
                .map(ExamAssignment::getPublishedVersionId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> examIds = publishedVersionRepository.findAllById(versionIds).stream()
                .map(ExamPublishedVersion::getExamId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return examRepository.findAllById(examIds).stream().map(this::examToDto).toList();
    }

    public Map<String, Object> getExamTaskDetail(String id) {
        Exam exam = getExam(id);
        return examToDto(exam);
    }

    public PageDto<Map<String, Object>> listExamRecords(int page, int pageSize) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        Page<ExamAttempt> result = attemptRepository.findByEmployeeIdOrderByCreatedAtDesc(
                employeeId, PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::attemptSummaryToDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Map<String, Object> startAttempt(String examId) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        Exam exam = getExam(examId);
        if ("paused".equals(exam.getRunStatus())) {
            throw BusinessException.of(ErrorCode.ATT_EXAM_PAUSED, "考试已暂停", 403);
        }
        if (!"openForAttempt".equals(exam.getLifecycle())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "考试未开放", 422);
        }

        Instant now = Instant.now();
        if (exam.getOpenStartAt() != null && now.isBefore(exam.getOpenStartAt())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "考试尚未开始", 422);
        }
        if (exam.getStopAttemptAt() != null && now.isAfter(exam.getStopAttemptAt())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "已超过开考截止时间", 422);
        }

        List<String> activeStatuses = List.of("inProgress", "submitting");
        attemptRepository.findByExamIdAndEmployeeIdAndAttemptStatusIn(examId, employeeId, activeStatuses)
                .ifPresent(existing -> {
                    Map<String, Object> response = buildStartResponse(existing);
                    throw new AttemptResumeException(response);
                });

        ExamPublishedVersion version = publishedVersionRepository.findById(exam.getPublishedVersionId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "发布版本不存在", 404));

        Map<String, Object> versionConfig = JsonHelper.toMap(version.getConfigJson());
        int maxAttempts = intValue(versionConfig.get("maxAttempts"), 1);
        long priorAttempts = attemptRepository.countByExamIdAndEmployeeId(examId, employeeId);
        if (priorAttempts >= maxAttempts) {
            throw BusinessException.of(ErrorCode.ATT_NO_REMAINING_OPPORTUNITY, "已无剩余考试次数", 422);
        }

        assignmentRepository.findByPublishedVersionIdAndEmployeeId(version.getId(), employeeId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.SEC_FORBIDDEN, "不在应考名单", 403));

        int attemptNumber = (int) priorAttempts + 1;
        int durationMinutes = intValue(versionConfig.get("durationMinutes"), 60);

        ExamAttempt attempt = new ExamAttempt();
        attempt.setId(IdGenerator.newId("eat"));
        attempt.setExamId(examId);
        attempt.setEmployeeId(employeeId);
        attempt.setPublishedVersionId(version.getId());
        attempt.setAttemptNumber(attemptNumber);
        attempt.setVoided(false);
        attempt.setStartedAt(now);
        attempt.setExpiresAt(now.plus(Duration.ofMinutes(durationMinutes)));
        try {
            attemptRepository.save(attempt);
        } catch (DataIntegrityViolationException ex) {
            return attemptRepository.findByExamIdAndEmployeeIdAndAttemptStatusIn(examId, employeeId, activeStatuses)
                    .map(this::buildStartResponse)
                    .orElseThrow(() -> ex);
        }

        // Reuse the freshly generated items instead of re-reading the paper we just wrote.
        return buildStartResponse(attempt, generatePaper(attempt));
    }

    public Map<String, Object> getActiveAttemptForExam(String examId) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        List<String> activeStatuses = List.of("inProgress", "submitting");
        return attemptRepository.findByExamIdAndEmployeeIdAndAttemptStatusIn(examId, employeeId, activeStatuses)
                .map(this::buildStartResponse)
                .orElse(Collections.emptyMap());
    }

    public Map<String, Object> getAttemptDetail(String attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        Exam exam = getExam(attempt.getExamId());

        Map<String, Object> dto = new HashMap<>();
        dto.put("attemptId", attempt.getId());
        dto.put("examId", attempt.getExamId());
        dto.put("attemptStatus", attempt.getAttemptStatus());
        dto.put("attemptNumber", attempt.getAttemptNumber());
        dto.put("timing", buildTiming(attempt));
        dto.put("lifecycle", exam.getLifecycle());
        dto.put("runStatus", exam.getRunStatus());
        dto.put("confirmedAnswers", listConfirmedAnswers(attemptId));
        return dto;
    }

    public Map<String, Object> getPaper(String attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        return buildPaperFromItems(attemptId, paperItemRepository.findByExamAttemptIdOrderByItemOrderAsc(attemptId));
    }

    private Map<String, Object> buildPaperFromItems(String attemptId, List<ExamPaperItem> items) {
        List<PaperHelper.PaperItemSource> sources = items.stream()
                .map(i -> new PaperHelper.PaperItemSource(i.getId(), i.getItemOrder(), i.getQuestionVersionId(), i.getScore()))
                .toList();
        return PaperHelper.buildPaper(attemptId, sources, questionService);
    }

    @Transactional
    public SaveAnswerResponse saveAnswer(String attemptId, String itemId, SaveAnswerRequest request) {
        ExamAttempt attempt = getAttempt(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        ensureAttemptActive(attempt);

        ExamAnswer answer = answerRepository.findByExamAttemptIdAndPaperItemId(attemptId, itemId)
                .orElseGet(() -> {
                    ExamAnswer a = new ExamAnswer();
                    a.setId(IdGenerator.newId("eans"));
                    a.setExamAttemptId(attemptId);
                    a.setPaperItemId(itemId);
                    a.setAnswerVersion(0);
                    return a;
                });

        if (request.answerVersion() <= answer.getAnswerVersion()) {
            throw BusinessException.of(ErrorCode.ANS_VERSION_CONFLICT, "答案版本冲突", 409);
        }

        answer.setAnswerJson(JsonHelper.toJson(request.answer()));
        answer.setAnswerVersion(request.answerVersion());
        answer.setSaveStatus("saved");
        answer.setConfirmedAt(Instant.now());
        answerRepository.save(answer);

        return new SaveAnswerResponse(itemId, answer.getAnswerVersion(), "saved", answer.getConfirmedAt());
    }

    @Transactional
    public void submitAttempt(String attemptId, String reason) {
        ExamAttempt attempt = getAttempt(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        if ("completed".equals(attempt.getAttemptStatus())) {
            return;
        }

        List<ExamAnswer> answers = answerRepository.findByExamAttemptId(attemptId);
        boolean hasUnconfirmed = paperItemRepository.findByExamAttemptIdOrderByItemOrderAsc(attemptId).stream()
                .anyMatch(item -> answers.stream()
                        .noneMatch(a -> a.getPaperItemId().equals(item.getId()) && "saved".equals(a.getSaveStatus())));
        if (hasUnconfirmed && !"timeout".equals(reason)) {
            throw BusinessException.of(ErrorCode.ANS_UNCONFIRMED_ANSWERS, "存在未确认答案", 409);
        }

        finishAttempt(attempt, reason);
    }

    public List<String> findExpiredAttemptIds() {
        return attemptRepository.findByAttemptStatusAndExpiresAtBefore("inProgress", Instant.now()).stream()
                .map(ExamAttempt::getId)
                .toList();
    }

    /**
     * System-initiated timeout submission. Runs in its own transaction so that one failing attempt
     * cannot roll back a whole batch of simultaneous expiries, and skips the owner check because
     * there is no authenticated principal on the scheduler thread.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void autoSubmitAttempt(String attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        if (!"inProgress".equals(attempt.getAttemptStatus())) {
            return;
        }
        finishAttempt(attempt, "timeout");
    }

    private void finishAttempt(ExamAttempt attempt, String reason) {
        attempt.setAttemptStatus("completed");
        attempt.setSubmitReason(reason != null ? reason : "manual");
        attempt.setSubmittedAt(Instant.now());
        attemptRepository.save(attempt);
        scoreAttempt(attempt);
    }

    public Map<String, Object> getAttemptResult(String attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        Exam exam = getExam(attempt.getExamId());
        ExamResult result = resultRepository.findByExamAttemptId(attemptId).orElse(null);

        ExamPublishedVersion version = publishedVersionRepository.findById(attempt.getPublishedVersionId()).orElse(null);
        Map<String, Object> versionConfig = version != null ? JsonHelper.toMap(version.getConfigJson()) : Map.of();
        Map<String, Object> resultPolicy = versionConfig.containsKey("resultPolicy")
                ? section(versionConfig, "resultPolicy")
                : Map.of();
        BigDecimal passingScore = decimalValue(versionConfig.get("passingScore"), BigDecimal.ZERO);

        boolean resultLocked = exam.isResultLocked();
        boolean summaryVisible = !resultLocked && ("completed".equals(attempt.getAttemptStatus()) || "voided".equals(attempt.getAttemptStatus()));
        boolean perItemReviewAllowed = summaryVisible && boolValue(resultPolicy.get("perItemReviewAllowed"), true);
        boolean passingScoreVisible = summaryVisible && boolValue(resultPolicy.get("passingScoreVisible"), false);
        boolean passConclusionVisible = summaryVisible && boolValue(resultPolicy.get("passConclusionVisible"), false);

        Map<String, Object> dto = new HashMap<>();
        dto.put("attemptId", attemptId);
        dto.put("visibility", Map.of(
                "summaryVisible", summaryVisible,
                "passingScoreVisible", passingScoreVisible,
                "passConclusionVisible", passConclusionVisible,
                "perItemReviewAllowed", perItemReviewAllowed
        ));
        if (result != null && summaryVisible) {
            dto.put("totalScore", result.getTotalScore());
            dto.put("maxScore", result.getMaxScore());
            if (passConclusionVisible) {
                dto.put("passed", result.getTotalScore().compareTo(passingScore) >= 0);
            }
            if (passingScoreVisible) {
                dto.put("passingScore", passingScore);
            }
            if (perItemReviewAllowed) {
                dto.put("items", JsonHelper.parse(result.getDetailJson()));
            }
        }
        return dto;
    }

    private boolean boolValue(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    public ExamAttempt getAttempt(String attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "尝试不存在", 404));
    }

    private List<ExamPaperItem> generatePaper(ExamAttempt attempt) {
        List<ExamRuleLine> ruleLines = ruleLineRepository
                .findByPublishedVersionIdOrderByLineOrderAsc(attempt.getPublishedVersionId());
        if (ruleLines.isEmpty()) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "发布版本缺少组卷规则", 422);
        }

        List<ExamPaperItem> paperItems = new ArrayList<>();
        // Only candidate ids are read: a 10,000-question bank must not be hydrated on every attempt
        // start (PERF-02 caps the start at P95 <= 3s under 500 concurrent opens).
        Map<String, List<String>> poolCache = new HashMap<>();
        int order = 1;
        for (ExamRuleLine ruleLine : ruleLines) {
            Map<String, Object> filter = JsonHelper.toMap(ruleLine.getFilterJson());
            String bankId = stringValue(filter.get("bankId"));
            String type = stringValue(filter.get("type"));
            List<String> pool = candidateVersionIds(poolCache, bankId, type);

            if (pool.size() < ruleLine.getDrawCount()) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR,
                        "题池不足，无法组卷（需要 " + ruleLine.getDrawCount() + "，可用 " + pool.size() + "）", 422);
            }

            List<String> shuffled = new ArrayList<>(pool);
            Collections.shuffle(shuffled);
            for (int i = 0; i < ruleLine.getDrawCount(); i++) {
                ExamPaperItem item = new ExamPaperItem();
                item.setId(IdGenerator.newId("epi"));
                item.setExamAttemptId(attempt.getId());
                item.setItemOrder(order++);
                item.setQuestionVersionId(shuffled.get(i));
                item.setScore(ruleLine.getScorePerQuestion());
                paperItems.add(item);
            }
        }
        paperItemRepository.saveAll(paperItems);
        return paperItems;
    }

    private List<String> candidateVersionIds(Map<String, List<String>> cache, String bankId, String type) {
        // Several rule lines usually share the same bank and type, so the pool is read once per key.
        return cache.computeIfAbsent(
                bankId + '\u0000' + (type == null ? "" : type),
                key -> questionService.findActiveVersionIdsByBank(bankId, type));
    }

    private void applyBasicWizardData(Exam exam, Map<String, Object> body) {
        if (body.containsKey("title")) {
            exam.setTitle(String.valueOf(body.get("title")));
        }
        if (body.containsKey("description")) {
            exam.setDescription(body.get("description") != null ? String.valueOf(body.get("description")) : null);
        }
        if (body.containsKey("openStartAt")) {
            exam.setOpenStartAt(parseInstant(body.get("openStartAt")));
        }
        if (body.containsKey("stopAttemptAt")) {
            exam.setStopAttemptAt(parseInstant(body.get("stopAttemptAt")));
        }
    }

    private void createAssignments(String publishedVersionId, Map<String, Object> assignments) {
        String mode = assignments.getOrDefault("mode", "allActive").toString();
        if ("selected".equals(mode)) {
            List<String> employeeIds = stringList(assignments.get("employeeIds"));
            for (int from = 0; from < employeeIds.size(); from += BATCH_SIZE) {
                List<String> chunk = employeeIds.subList(from, Math.min(from + BATCH_SIZE, employeeIds.size()));
                Map<String, Employee> found = employeeRepository.findAllById(chunk).stream()
                        .collect(Collectors.toMap(Employee::getId, employee -> employee));
                List<Employee> active = new ArrayList<>(chunk.size());
                for (String employeeId : chunk) {
                    Employee employee = found.get(employeeId);
                    if (employee == null) {
                        throw BusinessException.of(ErrorCode.NOT_FOUND, "员工不存在: " + employeeId, 404);
                    }
                    if ("active".equals(employee.getStatus())) {
                        active.add(employee);
                    }
                }
                saveAssignmentBatch(publishedVersionId, active);
            }
            return;
        }

        int pageIndex = 0;
        Page<Employee> page;
        do {
            page = employeeRepository.searchEmployees(null, "active", null, PageRequest.of(pageIndex, BATCH_SIZE));
            saveAssignmentBatch(publishedVersionId, page.getContent());
            pageIndex++;
        } while (page.hasNext());
    }

    private void saveAssignmentBatch(String publishedVersionId, List<Employee> employees) {
        if (employees.isEmpty()) {
            return;
        }
        Map<String, String> departmentPaths = loadDepartmentPaths(employees);
        List<ExamAssignment> batch = new ArrayList<>(employees.size());
        for (Employee employee : employees) {
            String departmentPath = departmentPaths.get(employee.getDepartmentId());
            if (departmentPath == null) {
                throw BusinessException.of(ErrorCode.NOT_FOUND, "部门不存在", 404);
            }
            ExamAssignment assignment = new ExamAssignment();
            assignment.setId(IdGenerator.newId("asg"));
            assignment.setPublishedVersionId(publishedVersionId);
            assignment.setEmployeeId(employee.getId());
            assignment.setEmployeeNoSnapshot(employee.getEmployeeNo());
            assignment.setDisplayNameSnapshot(employee.getDisplayName());
            assignment.setDepartmentPathSnapshot(departmentPath);
            batch.add(assignment);
        }
        assignmentRepository.saveAll(batch);
        assignmentRepository.flush();
    }

    private Map<String, String> loadDepartmentPaths(List<Employee> employees) {
        Set<String> departmentIds = employees.stream()
                .map(Employee::getDepartmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (departmentIds.isEmpty()) {
            return Map.of();
        }
        return departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(Department::getId, Department::getPath));
    }

    private long countPlannedAssignees(Map<String, Object> assignments) {
        String mode = assignments.getOrDefault("mode", "allActive").toString();
        if ("selected".equals(mode)) {
            return stringList(assignments.get("employeeIds")).size();
        }
        return employeeRepository.searchEmployees(null, "active", null, PageRequest.of(0, 1)).getTotalElements();
    }

    private String normalizeWizardStep(String step) {
        return switch (step) {
            case "basic" -> "basic";
            case "rules" -> "rules";
            case "assignments", "assignees" -> "assignments";
            case "resultPolicy", "visibility" -> "resultPolicy";
            case "review" -> "review";
            default -> step;
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> section(Map<String, Object> config, String key) {
        Object value = config.get(key);
        if (value instanceof Map<?, ?> map) {
            return new LinkedHashMap<>((Map<String, Object>) map);
        }
        return new LinkedHashMap<>();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> mapList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                result.add(new LinkedHashMap<>((Map<String, Object>) map));
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream().filter(Objects::nonNull).map(Object::toString).toList();
    }

    private Map<String, Object> issue(String code, String message) {
        Map<String, Object> issue = new LinkedHashMap<>();
        issue.put("code", code);
        issue.put("message", message);
        return issue;
    }

    private Map<String, Object> issue(String code, String message, int ruleLineIndex) {
        Map<String, Object> issue = issue(code, message);
        issue.put("ruleLineIndex", ruleLineIndex);
        return issue;
    }

    private Instant parseInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        String text = String.valueOf(value);
        if (text.isBlank()) {
            return null;
        }
        return Instant.parse(text);
    }

    private int intValue(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(String.valueOf(value));
    }

    private BigDecimal decimalValue(Object value, BigDecimal defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private void scoreAttempt(ExamAttempt attempt) {
        List<ExamPaperItem> items = paperItemRepository.findByExamAttemptIdOrderByItemOrderAsc(attempt.getId());
        // Scoring runs for every expiring attempt at once (PERF-03), so both the versions and the
        // answers are fetched in one query each rather than per paper item.
        Map<String, QuestionVersion> versions = questionService.requireVersions(items.stream()
                .map(ExamPaperItem::getQuestionVersionId)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        Map<String, List<String>> answersByItem = new HashMap<>();
        for (ExamAnswer answer : answerRepository.findByExamAttemptId(attempt.getId())) {
            answersByItem.put(answer.getPaperItemId(), JsonHelper.toStringList(answer.getAnswerJson()));
        }

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        List<Map<String, Object>> details = new ArrayList<>();

        for (ExamPaperItem item : items) {
            max = max.add(item.getScore());
            QuestionVersion version = versions.get(item.getQuestionVersionId());
            List<String> userAnswer = answersByItem.getOrDefault(item.getId(), List.of());
            boolean correct = scoringService.isCorrect(version.getType(), version.getStandardAnswer(), userAnswer);
            if (correct) {
                total = total.add(item.getScore());
            }
            details.add(Map.of(
                    "itemId", item.getId(),
                    "isCorrect", correct,
                    "userAnswer", userAnswer,
                    "standardAnswer", JsonHelper.toStringList(version.getStandardAnswer()),
                    "explanation", version.getExplanation() != null ? version.getExplanation() : ""
            ));
        }

        ExamResult result = resultRepository.findByExamAttemptId(attempt.getId()).orElseGet(ExamResult::new);
        if (result.getId() == null) {
            result.setId(IdGenerator.newId("ers"));
            result.setExamAttemptId(attempt.getId());
        }
        result.setTotalScore(total);
        result.setMaxScore(max);
        result.setDetailJson(JsonHelper.toJson(details));
        result.setOfficialValid(!attempt.isVoided());
        resultRepository.save(result);
    }

    private List<Map<String, Object>> listConfirmedAnswers(String attemptId) {
        return answerRepository.findByExamAttemptId(attemptId).stream()
                .filter(a -> "saved".equals(a.getSaveStatus()))
                .map(a -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("itemId", a.getPaperItemId());
                    dto.put("answer", JsonHelper.toStringList(a.getAnswerJson()));
                    dto.put("confirmedVersion", a.getAnswerVersion());
                    dto.put("saveStatus", a.getSaveStatus());
                    return dto;
                }).toList();
    }

    private void ensureAttemptActive(ExamAttempt attempt) {
        if (!"inProgress".equals(attempt.getAttemptStatus())) {
            throw BusinessException.of(ErrorCode.ANS_ATTEMPT_TERMINATED, "尝试已结束", 409);
        }
    }

    private Map<String, Object> buildStartResponse(ExamAttempt attempt) {
        return buildStartResponse(attempt, paperItemRepository.findByExamAttemptIdOrderByItemOrderAsc(attempt.getId()));
    }

    private Map<String, Object> buildStartResponse(ExamAttempt attempt, List<ExamPaperItem> items) {
        Map<String, Object> response = new HashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("attemptStatus", attempt.getAttemptStatus());
        response.put("paper", buildPaperFromItems(attempt.getId(), items));
        response.put("timing", buildTiming(attempt));
        return response;
    }

    private Map<String, Object> buildTiming(ExamAttempt attempt) {
        Map<String, Object> timing = new HashMap<>();
        timing.put("startedAt", attempt.getStartedAt());
        timing.put("expiresAt", attempt.getExpiresAt());
        timing.put("remainingSeconds", Math.max(0, Duration.between(Instant.now(), attempt.getExpiresAt()).getSeconds()));
        timing.put("serverNow", Instant.now());
        return timing;
    }

    private Exam getExam(String id) {
        return examRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "考试不存在", 404));
    }

    private Map<String, Object> examToDto(Exam exam) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", exam.getId());
        dto.put("title", exam.getTitle());
        dto.put("description", exam.getDescription());
        dto.put("lifecycle", exam.getLifecycle());
        dto.put("runStatus", exam.getRunStatus());
        dto.put("openStartAt", exam.getOpenStartAt());
        dto.put("stopAttemptAt", exam.getStopAttemptAt());
        dto.put("publishedVersionId", exam.getPublishedVersionId());
        dto.put("resultLocked", exam.isResultLocked());
        return dto;
    }

    private Map<String, Object> attemptSummaryToDto(ExamAttempt attempt) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("attemptId", attempt.getId());
        dto.put("examId", attempt.getExamId());
        dto.put("attemptStatus", attempt.getAttemptStatus());
        dto.put("attemptNumber", attempt.getAttemptNumber());
        dto.put("startedAt", attempt.getStartedAt());
        return dto;
    }

    public static class AttemptResumeException extends RuntimeException {
        private final Map<String, Object> response;

        public AttemptResumeException(Map<String, Object> response) {
            this.response = response;
        }

        public Map<String, Object> getResponse() {
            return response;
        }
    }
}
