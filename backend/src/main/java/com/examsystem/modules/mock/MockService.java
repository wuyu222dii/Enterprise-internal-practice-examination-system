package com.examsystem.modules.mock;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.common.PaperHelper;
import com.examsystem.modules.mock.dto.CreateMockAttemptRequest;
import com.examsystem.modules.mock.dto.SaveAnswerRequest;
import com.examsystem.modules.mock.dto.SaveAnswerResponse;
import com.examsystem.modules.mock.entity.MockAnswer;
import com.examsystem.modules.mock.entity.MockAttempt;
import com.examsystem.modules.mock.entity.MockPaperItem;
import com.examsystem.modules.mock.entity.MockResult;
import com.examsystem.modules.mock.repository.MockAnswerRepository;
import com.examsystem.modules.mock.repository.MockAttemptRepository;
import com.examsystem.modules.mock.repository.MockPaperItemRepository;
import com.examsystem.modules.mock.repository.MockResultRepository;
import com.examsystem.modules.question.QuestionService;
import com.examsystem.modules.question.entity.QuestionBank;
import com.examsystem.modules.question.entity.QuestionVersion;
import com.examsystem.modules.question.repository.QuestionBankRepository;
import com.examsystem.modules.scoring.ScoringService;
import com.examsystem.security.SecurityUtils;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MockService {

    private final MockAttemptRepository attemptRepository;
    private final MockPaperItemRepository paperItemRepository;
    private final MockAnswerRepository answerRepository;
    private final MockResultRepository resultRepository;
    private final QuestionBankRepository questionBankRepository;
    private final QuestionService questionService;
    private final ScoringService scoringService;

    public MockService(
            MockAttemptRepository attemptRepository,
            MockPaperItemRepository paperItemRepository,
            MockAnswerRepository answerRepository,
            MockResultRepository resultRepository,
            QuestionBankRepository questionBankRepository,
            QuestionService questionService,
            ScoringService scoringService
    ) {
        this.attemptRepository = attemptRepository;
        this.paperItemRepository = paperItemRepository;
        this.answerRepository = answerRepository;
        this.resultRepository = resultRepository;
        this.questionBankRepository = questionBankRepository;
        this.questionService = questionService;
        this.scoringService = scoringService;
    }

    public List<Map<String, Object>> listBanks() {
        return questionBankRepository.findByMockEnabledTrueAndStatus("active").stream()
                .map(this::bankToDto).toList();
    }

    public Map<String, Object> getActiveAttempt() {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        return attemptRepository.findByEmployeeIdAndStatus(employeeId, "in_progress")
                .map(this::attemptToDto)
                .orElse(Collections.emptyMap());
    }

    @Transactional
    public Map<String, Object> createAttempt(CreateMockAttemptRequest request) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        attemptRepository.findByEmployeeIdAndStatus(employeeId, "in_progress").ifPresent(a -> {
            throw BusinessException.of(ErrorCode.SIM_ATTEMPT_ALREADY_ACTIVE, "已有进行中的模拟", 409);
        });

        QuestionBank bank = questionService.requireActiveBank(request.questionBankId());
        if (!bank.isMockEnabled()) {
            throw BusinessException.of(ErrorCode.QST_BANK_DISABLED, "题库未开放模拟", 422);
        }

        // Draw from candidate ids and hydrate only the drawn versions.
        List<String> candidateIds = new ArrayList<>(
                questionService.findActiveVersionIdsByBank(request.questionBankId(), null));
        Collections.shuffle(candidateIds);
        List<String> drawnIds = candidateIds.subList(0, Math.min(request.questionCount(), candidateIds.size()));
        Map<String, QuestionVersion> drawn = questionService.requireVersions(new LinkedHashSet<>(drawnIds));
        List<QuestionVersion> selected = drawnIds.stream().map(drawn::get).toList();

        Instant now = Instant.now();
        MockAttempt attempt = new MockAttempt();
        attempt.setId(IdGenerator.newId("mka"));
        attempt.setEmployeeId(employeeId);
        attempt.setQuestionBankId(request.questionBankId());
        attempt.setQuestionCount(selected.size());
        attempt.setDurationMinutes(request.durationMinutes());
        attempt.setStartedAt(now);
        attempt.setExpiresAt(now.plus(Duration.ofMinutes(request.durationMinutes())));
        attemptRepository.save(attempt);

        List<MockPaperItem> paperItems = new ArrayList<>(selected.size());
        int order = 1;
        for (QuestionVersion version : selected) {
            MockPaperItem item = new MockPaperItem();
            item.setId(IdGenerator.newId("mpi"));
            item.setMockAttemptId(attempt.getId());
            item.setItemOrder(order++);
            item.setQuestionVersionId(version.getId());
            item.setScore(version.getDefaultScore());
            paperItems.add(item);
        }
        paperItemRepository.saveAll(paperItems);

        Map<String, Object> response = new HashMap<>();
        response.put("attemptId", attempt.getId());
        response.put("status", attempt.getStatus());
        response.put("paper", buildPaperFromItems(attempt.getId(), paperItems));
        response.put("timing", buildTiming(attempt));
        return response;
    }

    public Map<String, Object> getAttempt(String id) {
        MockAttempt attempt = getAttemptEntity(id);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        Map<String, Object> dto = attemptToDto(attempt);
        dto.put("timing", buildTiming(attempt));
        return dto;
    }

    public Map<String, Object> getPaper(String id) {
        MockAttempt attempt = getAttemptEntity(id);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        return buildPaperFromItems(id, paperItemRepository.findByMockAttemptIdOrderByItemOrderAsc(id));
    }

    private Map<String, Object> buildPaperFromItems(String attemptId, List<MockPaperItem> items) {
        List<PaperHelper.PaperItemSource> sources = items.stream()
                .map(i -> new PaperHelper.PaperItemSource(i.getId(), i.getItemOrder(), i.getQuestionVersionId(), i.getScore()))
                .toList();
        return PaperHelper.buildPaper(attemptId, sources, questionService);
    }

    @Transactional
    public SaveAnswerResponse saveAnswer(String attemptId, String itemId, SaveAnswerRequest request) {
        MockAttempt attempt = getAttemptEntity(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        ensureInProgress(attempt);

        MockAnswer answer = answerRepository.findByMockAttemptIdAndPaperItemId(attemptId, itemId)
                .orElseGet(() -> {
                    MockAnswer a = new MockAnswer();
                    a.setId(IdGenerator.newId("mans"));
                    a.setMockAttemptId(attemptId);
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
    public void submit(String attemptId) {
        MockAttempt attempt = getAttemptEntity(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        finishAttempt(attempt);
    }

    /**
     * System-initiated timeout submission: no authenticated principal on the scheduler thread, and a
     * dedicated transaction so one failure does not roll back the rest of the batch.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void autoSubmitAttempt(String attemptId) {
        finishAttempt(getAttemptEntity(attemptId));
    }

    private void finishAttempt(MockAttempt attempt) {
        if (!"in_progress".equals(attempt.getStatus())) {
            return;
        }
        attempt.setStatus("completed");
        attemptRepository.save(attempt);
        scoreAttempt(attempt);
    }

    @Transactional
    public void abandon(String attemptId) {
        MockAttempt attempt = getAttemptEntity(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        attempt.setStatus("terminated");
        attempt.setTerminateReason("abandoned");
        attempt.setTerminatedAt(Instant.now());
        attemptRepository.save(attempt);
    }

    public Map<String, Object> getResult(String attemptId) {
        MockAttempt attempt = getAttemptEntity(attemptId);
        SecurityUtils.requireOwnerOrAdmin(attempt.getEmployeeId());
        MockResult result = resultRepository.findByMockAttemptId(attemptId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "结果不存在", 404));
        Map<String, Object> dto = new HashMap<>();
        dto.put("attemptId", attemptId);
        dto.put("totalScore", result.getTotalScore());
        dto.put("maxScore", result.getMaxScore());
        dto.put("detail", JsonHelper.parse(result.getDetailJson()));
        return dto;
    }

    public PageDto<Map<String, Object>> listRecords(int page, int pageSize) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        Page<MockAttempt> result = attemptRepository.findByEmployeeIdOrderByCreatedAtDesc(
                employeeId, PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::attemptToDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    public List<String> findExpiredAttemptIds() {
        return attemptRepository.findByStatusAndExpiresAtBefore("in_progress", Instant.now()).stream()
                .map(MockAttempt::getId)
                .toList();
    }

    private void scoreAttempt(MockAttempt attempt) {
        List<MockPaperItem> items = paperItemRepository.findByMockAttemptIdOrderByItemOrderAsc(attempt.getId());
        Map<String, QuestionVersion> versions = questionService.requireVersions(items.stream()
                .map(MockPaperItem::getQuestionVersionId)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        Map<String, List<String>> answersByItem = new HashMap<>();
        for (MockAnswer answer : answerRepository.findByMockAttemptId(attempt.getId())) {
            answersByItem.put(answer.getPaperItemId(), JsonHelper.toStringList(answer.getAnswerJson()));
        }

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        List<Map<String, Object>> details = new ArrayList<>();

        for (MockPaperItem item : items) {
            max = max.add(item.getScore());
            QuestionVersion version = versions.get(item.getQuestionVersionId());
            List<String> userAnswer = answersByItem.getOrDefault(item.getId(), List.of());
            boolean correct = scoringService.isCorrect(version.getType(), version.getStandardAnswer(), userAnswer);
            if (correct) {
                total = total.add(item.getScore());
            }
            details.add(Map.of("itemId", item.getId(), "isCorrect", correct));
        }

        MockResult result = new MockResult();
        result.setId(IdGenerator.newId("mkr"));
        result.setMockAttemptId(attempt.getId());
        result.setTotalScore(total);
        result.setMaxScore(max);
        result.setDetailJson(JsonHelper.toJson(details));
        resultRepository.save(result);
    }

    private void ensureInProgress(MockAttempt attempt) {
        if (!"in_progress".equals(attempt.getStatus())) {
            throw BusinessException.of(ErrorCode.ANS_ATTEMPT_TERMINATED, "模拟已结束", 409);
        }
        if (attempt.getExpiresAt().isBefore(Instant.now())) {
            throw BusinessException.of(ErrorCode.ANS_ATTEMPT_TERMINATED, "模拟已超时", 409);
        }
    }

    private MockAttempt getAttemptEntity(String id) {
        return attemptRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "模拟尝试不存在", 404));
    }

    private Map<String, Object> buildTiming(MockAttempt attempt) {
        Map<String, Object> timing = new HashMap<>();
        timing.put("startedAt", attempt.getStartedAt());
        timing.put("expiresAt", attempt.getExpiresAt());
        timing.put("remainingSeconds", Math.max(0, Duration.between(Instant.now(), attempt.getExpiresAt()).getSeconds()));
        timing.put("serverNow", Instant.now());
        return timing;
    }

    private Map<String, Object> bankToDto(QuestionBank bank) {
        return Map.of("id", bank.getId(), "name", bank.getName());
    }

    private Map<String, Object> attemptToDto(MockAttempt attempt) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", attempt.getId());
        dto.put("questionBankId", attempt.getQuestionBankId());
        dto.put("status", attempt.getStatus());
        dto.put("questionCount", attempt.getQuestionCount());
        dto.put("durationMinutes", attempt.getDurationMinutes());
        dto.put("startedAt", attempt.getStartedAt());
        dto.put("expiresAt", attempt.getExpiresAt());
        return dto;
    }
}
