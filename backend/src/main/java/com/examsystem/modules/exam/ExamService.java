package com.examsystem.modules.exam;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.common.PaperHelper;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExamService {

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
            ScoringService scoringService
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
        examRepository.save(exam);
    }

    public Map<String, Object> preflight(String id) {
        SecurityUtils.requireAdmin();
        return Map.of("examId", id, "ready", true, "issues", List.of());
    }

    @Transactional
    public void publishExam(String id) {
        SecurityUtils.requireAdmin();
        Exam exam = getExam(id);
        ExamPublishedVersion version = new ExamPublishedVersion();
        version.setId(IdGenerator.newId("epv"));
        version.setExamId(id);
        version.setVersionNo(1);
        version.setConfigJson(JsonHelper.toJson(Map.of("durationMinutes", 60)));
        version.setPublishedAt(Instant.now());
        publishedVersionRepository.save(version);

        Employee admin = employeeRepository.findById(SecurityUtils.requirePrincipal().getEmployeeId()).orElseThrow();
        Department dept = departmentRepository.findById(admin.getDepartmentId()).orElseThrow();
        ExamAssignment assignment = new ExamAssignment();
        assignment.setId(IdGenerator.newId("asg"));
        assignment.setPublishedVersionId(version.getId());
        assignment.setEmployeeId(admin.getId());
        assignment.setEmployeeNoSnapshot(admin.getEmployeeNo());
        assignment.setDisplayNameSnapshot(admin.getDisplayName());
        assignment.setDepartmentPathSnapshot(dept.getPath());
        assignmentRepository.save(assignment);

        exam.setPublishedVersionId(version.getId());
        exam.setLifecycle("openForAttempt");
        exam.setOpenStartAt(Instant.now());
        examRepository.save(exam);
    }

    @Transactional
    public void cancelExam(String id, String employeeVisibleReason, String internalReason) {
        SecurityUtils.requireAdmin();
        Exam exam = getExam(id);
        exam.setLifecycle("cancelled");
        examRepository.save(exam);
    }

    public Map<String, Object> getMonitor(String id) {
        SecurityUtils.requireAdmin();
        List<ExamAttempt> attempts = attemptRepository.findByExamId(id);
        return Map.of("examId", id, "attemptCount", attempts.size());
    }

    public List<Map<String, Object>> listExamTasks() {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        return assignmentRepository.findByEmployeeId(employeeId).stream()
                .map(a -> {
                    ExamPublishedVersion pv = publishedVersionRepository.findById(a.getPublishedVersionId()).orElseThrow();
                    Exam exam = getExam(pv.getExamId());
                    return examToDto(exam);
                }).toList();
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

        List<String> activeStatuses = List.of("inProgress", "submitting");
        attemptRepository.findByExamIdAndEmployeeIdAndAttemptStatusIn(examId, employeeId, activeStatuses)
                .ifPresent(existing -> {
                    Map<String, Object> response = buildStartResponse(existing);
                    throw new AttemptResumeException(response);
                });

        ExamPublishedVersion version = publishedVersionRepository.findById(exam.getPublishedVersionId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "发布版本不存在", 404));

        assignmentRepository.findByPublishedVersionIdAndEmployeeId(version.getId(), employeeId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.SEC_FORBIDDEN, "不在应考名单", 403));

        int attemptNumber = (int) attemptRepository.countByExamIdAndEmployeeId(examId, employeeId) + 1;
        Instant now = Instant.now();
        ExamAttempt attempt = new ExamAttempt();
        attempt.setId(IdGenerator.newId("eat"));
        attempt.setExamId(examId);
        attempt.setEmployeeId(employeeId);
        attempt.setPublishedVersionId(version.getId());
        attempt.setAttemptNumber(attemptNumber);
        attempt.setVoided(false);
        attempt.setStartedAt(now);
        attempt.setExpiresAt(now.plus(Duration.ofMinutes(60)));
        attemptRepository.save(attempt);

        generatePaper(attempt);
        return buildStartResponse(attempt);
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
        List<ExamPaperItem> items = paperItemRepository.findByExamAttemptIdOrderByItemOrderAsc(attemptId);
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

        attempt.setAttemptStatus("completed");
        attempt.setSubmitReason(reason != null ? reason : "manual");
        attemptRepository.save(attempt);
        scoreAttempt(attempt);
    }

    public Map<String, Object> getAttemptResult(String attemptId) {
        ExamAttempt attempt = getAttempt(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        ExamResult result = resultRepository.findByExamAttemptId(attemptId).orElse(null);
        Map<String, Object> dto = new HashMap<>();
        dto.put("attemptId", attemptId);
        dto.put("visibility", Map.of(
                "summaryVisible", true,
                "passingScoreVisible", false,
                "passConclusionVisible", false,
                "perItemReviewAllowed", true
        ));
        if (result != null) {
            dto.put("totalScore", result.getTotalScore());
            dto.put("maxScore", result.getMaxScore());
            dto.put("items", JsonHelper.parse(result.getDetailJson()));
        }
        return dto;
    }

    @Transactional
    public void autoSubmitExpiredAttempts() {
        List<ExamAttempt> expired = attemptRepository.findByAttemptStatusAndExpiresAtBefore("inProgress", Instant.now());
        for (ExamAttempt attempt : expired) {
            submitAttempt(attempt.getId(), "timeout");
        }
    }

    public ExamAttempt getAttempt(String attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "尝试不存在", 404));
    }

    private void generatePaper(ExamAttempt attempt) {
        List<QuestionVersion> versions = new ArrayList<>(questionService.findActiveVersionsByBank(resolveBankId()));
        Collections.shuffle(versions);
        int count = Math.min(5, versions.size());
        int order = 1;
        for (int i = 0; i < count; i++) {
            QuestionVersion version = versions.get(i);
            ExamPaperItem item = new ExamPaperItem();
            item.setId(IdGenerator.newId("epi"));
            item.setExamAttemptId(attempt.getId());
            item.setItemOrder(order++);
            item.setQuestionVersionId(version.getId());
            item.setScore(version.getDefaultScore());
            paperItemRepository.save(item);
        }
    }

    private String resolveBankId() {
        List<Map<String, Object>> banks = questionService.listBanks();
        if (banks.isEmpty()) {
            return "none";
        }
        return banks.get(0).get("id").toString();
    }

    private void scoreAttempt(ExamAttempt attempt) {
        List<ExamPaperItem> items = paperItemRepository.findByExamAttemptIdOrderByItemOrderAsc(attempt.getId());
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        List<Map<String, Object>> details = new ArrayList<>();

        for (ExamPaperItem item : items) {
            max = max.add(item.getScore());
            QuestionVersion version = questionService.requireVersion(item.getQuestionVersionId());
            List<String> userAnswer = answerRepository.findByExamAttemptIdAndPaperItemId(attempt.getId(), item.getId())
                    .map(a -> JsonHelper.toStringList(a.getAnswerJson()))
                    .orElse(List.of());
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
        Map<String, Object> response = new HashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("attemptNumber", attempt.getAttemptNumber());
        response.put("attemptStatus", attempt.getAttemptStatus());
        response.put("paper", getPaper(attempt.getId()));
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
