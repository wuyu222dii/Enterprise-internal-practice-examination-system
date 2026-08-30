package com.examsystem.modules.practice;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.modules.practice.dto.CreatePracticeSessionRequest;
import com.examsystem.modules.practice.entity.PracticeAnswer;
import com.examsystem.modules.practice.entity.PracticeSession;
import com.examsystem.modules.practice.entity.PracticeSessionItem;
import com.examsystem.modules.practice.entity.WrongBookEntry;
import com.examsystem.modules.practice.repository.PracticeAnswerRepository;
import com.examsystem.modules.practice.repository.PracticeSessionItemRepository;
import com.examsystem.modules.practice.repository.PracticeSessionRepository;
import com.examsystem.modules.practice.repository.WrongBookEntryRepository;
import com.examsystem.modules.question.QuestionService;
import com.examsystem.modules.question.entity.Question;
import com.examsystem.modules.question.entity.QuestionBank;
import com.examsystem.modules.question.entity.QuestionVersion;
import com.examsystem.modules.question.repository.QuestionBankRepository;
import com.examsystem.modules.scoring.ScoringService;
import com.examsystem.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PracticeService {

    private static final int WRONG_BOOK_LIMIT = 500;

    private final PracticeSessionRepository sessionRepository;
    private final PracticeSessionItemRepository sessionItemRepository;
    private final PracticeAnswerRepository answerRepository;
    private final WrongBookEntryRepository wrongBookRepository;
    private final QuestionBankRepository questionBankRepository;
    private final QuestionService questionService;
    private final ScoringService scoringService;

    public PracticeService(
            PracticeSessionRepository sessionRepository,
            PracticeSessionItemRepository sessionItemRepository,
            PracticeAnswerRepository answerRepository,
            WrongBookEntryRepository wrongBookRepository,
            QuestionBankRepository questionBankRepository,
            QuestionService questionService,
            ScoringService scoringService
    ) {
        this.sessionRepository = sessionRepository;
        this.sessionItemRepository = sessionItemRepository;
        this.answerRepository = answerRepository;
        this.wrongBookRepository = wrongBookRepository;
        this.questionBankRepository = questionBankRepository;
        this.questionService = questionService;
        this.scoringService = scoringService;
    }

    public List<Map<String, Object>> listBanks() {
        return questionBankRepository.findByPracticeEnabledTrueAndStatus("active").stream()
                .map(this::bankToDto).toList();
    }

    public Map<String, Object> getActiveSession() {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        return sessionRepository.findByEmployeeIdAndStatus(employeeId, "in_progress")
                .map(this::sessionToDto)
                .orElse(Collections.emptyMap());
    }

    @Transactional
    public Map<String, Object> createSession(CreatePracticeSessionRequest request) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        sessionRepository.findByEmployeeIdAndStatus(employeeId, "in_progress").ifPresent(s -> {
            throw BusinessException.of(ErrorCode.PRA_SESSION_ALREADY_ACTIVE, "已有进行中的练习", 409);
        });

        QuestionBank bank = questionService.requireActiveBank(request.questionBankId());
        if (!bank.isPracticeEnabled()) {
            throw BusinessException.of(ErrorCode.QST_BANK_DISABLED, "题库未开放练习", 422);
        }

        int count = request.questionCount() != null ? request.questionCount() : 10;
        List<QuestionVersion> versions = new ArrayList<>(selectQuestions(request, employeeId));
        if (versions.isEmpty()) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "暂无可用题目", 422);
        }
        if ("sequential".equals(request.mode())) {
            versions.sort(Comparator.comparing(QuestionVersion::getId));
        } else {
            Collections.shuffle(versions);
        }
        List<QuestionVersion> selected = versions.subList(0, Math.min(count, versions.size()));

        PracticeSession session = new PracticeSession();
        session.setId(IdGenerator.newId("prs"));
        session.setEmployeeId(employeeId);
        session.setQuestionBankId(request.questionBankId());
        session.setMode(request.mode());
        session.setQuestionCount(selected.size());
        sessionRepository.save(session);

        List<PracticeSessionItem> items = new ArrayList<>(selected.size());
        int order = 1;
        for (QuestionVersion version : selected) {
            PracticeSessionItem item = new PracticeSessionItem();
            item.setId(IdGenerator.newId("psi"));
            item.setPracticeSessionId(session.getId());
            item.setItemOrder(order++);
            item.setQuestionVersionId(version.getId());
            items.add(item);
        }
        sessionItemRepository.saveAll(items);
        return sessionToDto(session);
    }

    public Map<String, Object> getSession(String id) {
        PracticeSession session = getSessionEntity(id);
        SecurityUtils.requireOwnerOrAdmin(session.getEmployeeId());
        return sessionToDto(session);
    }

    @Transactional
    public Map<String, Object> submitAnswer(String sessionId, String questionVersionId, List<String> answer) {
        PracticeSession session = getSessionEntity(sessionId);
        SecurityUtils.requireOwnerOrAdmin(session.getEmployeeId());
        if (!"in_progress".equals(session.getStatus())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "练习已结束", 422);
        }

        QuestionVersion version = questionService.requireVersion(questionVersionId);
        boolean correct = scoringService.isCorrect(version.getType(), version.getStandardAnswer(), answer);

        PracticeAnswer practiceAnswer = answerRepository
                .findByPracticeSessionIdAndQuestionVersionId(sessionId, questionVersionId)
                .orElseGet(() -> {
                    PracticeAnswer pa = new PracticeAnswer();
                    pa.setId(IdGenerator.newId("pa"));
                    pa.setPracticeSessionId(sessionId);
                    pa.setQuestionVersionId(questionVersionId);
                    return pa;
                });
        practiceAnswer.setAnswerJson(JsonHelper.toJson(answer));
        practiceAnswer.setCorrect(correct);
        answerRepository.save(practiceAnswer);

        if (!correct) {
            upsertWrongBook(session.getEmployeeId(), questionVersionId);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("isCorrect", correct);
        result.put("standardAnswer", JsonHelper.toStringList(version.getStandardAnswer()));
        result.put("explanation", version.getExplanation());
        return result;
    }

    @Transactional
    public void finishSession(String sessionId) {
        PracticeSession session = getSessionEntity(sessionId);
        SecurityUtils.requireOwnerOrAdmin(session.getEmployeeId());
        session.setStatus("finished");
        session.setFinishedAt(Instant.now());
        sessionRepository.save(session);
    }

    public PageDto<Map<String, Object>> listWrongBook(int page, int pageSize) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        Page<WrongBookEntry> result = wrongBookRepository
                .findByEmployeeIdOrderByUpdatedAtDesc(employeeId, PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::wrongBookToDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    public PageDto<Map<String, Object>> listRecords(int page, int pageSize) {
        String employeeId = SecurityUtils.requirePrincipal().getEmployeeId();
        Page<PracticeSession> result = sessionRepository
                .findByEmployeeIdOrderByCreatedAtDesc(employeeId, PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::sessionToDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    private List<QuestionVersion> selectQuestions(CreatePracticeSessionRequest request, String employeeId) {
        if ("wrongBook".equals(request.mode())) {
            return selectFromWrongBook(request.questionBankId(), employeeId);
        }

        String categoryId = request.scope() != null ? request.scope().categoryId() : null;
        String knowledgePointId = request.scope() != null ? request.scope().knowledgePointId() : null;
        // A knowledge point already implies its category, so the narrower filter wins.
        if (knowledgePointId != null && !knowledgePointId.isBlank()) {
            categoryId = null;
        }
        return questionService.findActiveVersionsByScope(request.questionBankId(), categoryId, knowledgePointId);
    }

    private List<QuestionVersion> selectFromWrongBook(String bankId, String employeeId) {
        List<String> versionIds = wrongBookRepository.findByEmployeeIdOrderByUpdatedAtDesc(
                        employeeId, PageRequest.of(0, WRONG_BOOK_LIMIT)).getContent().stream()
                .map(WrongBookEntry::getQuestionVersionId)
                .toList();
        if (versionIds.isEmpty()) {
            return List.of();
        }

        Map<String, QuestionVersion> versions = questionService.requireVersions(new LinkedHashSet<>(versionIds));
        Map<String, Question> questions = questionService.findQuestionsByIds(versions.values().stream()
                .map(QuestionVersion::getQuestionId)
                .collect(Collectors.toCollection(LinkedHashSet::new)));

        List<QuestionVersion> selected = new ArrayList<>();
        for (String versionId : versionIds) {
            QuestionVersion version = versions.get(versionId);
            Question question = questions.get(version.getQuestionId());
            if (question != null && bankId.equals(question.getQuestionBankId())) {
                selected.add(version);
            }
        }
        return selected;
    }

    private PracticeSession getSessionEntity(String id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "练习会话不存在", 404));
    }

    private Map<String, Object> bankToDto(QuestionBank bank) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", bank.getId());
        dto.put("name", bank.getName());
        return dto;
    }

    private void upsertWrongBook(String employeeId, String questionVersionId) {
        WrongBookEntry entry = wrongBookRepository.findByEmployeeIdAndQuestionVersionId(employeeId, questionVersionId)
                .orElseGet(() -> {
                    WrongBookEntry e = new WrongBookEntry();
                    e.setId(IdGenerator.newId("wb"));
                    e.setEmployeeId(employeeId);
                    e.setQuestionVersionId(questionVersionId);
                    return e;
                });
        entry.setStatus("pending");
        wrongBookRepository.save(entry);
    }

    private Map<String, Object> sessionToDto(PracticeSession session) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", session.getId());
        dto.put("questionBankId", session.getQuestionBankId());
        dto.put("mode", session.getMode());
        dto.put("status", session.getStatus());
        dto.put("questionCount", session.getQuestionCount());
        dto.put("currentIndex", session.getCurrentIndex());
        dto.put("createdAt", session.getCreatedAt());
        dto.put("finishedAt", session.getFinishedAt());
        dto.put("items", buildSessionItems(session.getId()));
        return dto;
    }

    private List<Map<String, Object>> buildSessionItems(String sessionId) {
        List<PracticeSessionItem> items = sessionItemRepository.findByPracticeSessionIdOrderByItemOrderAsc(sessionId);
        Map<String, QuestionVersion> versions = questionService.requireVersions(items.stream()
                .map(PracticeSessionItem::getQuestionVersionId)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        return items.stream()
                .map(item -> {
                    QuestionVersion version = versions.get(item.getQuestionVersionId());
                    Map<String, Object> itemDto = new HashMap<>();
                    itemDto.put("itemId", item.getId());
                    itemDto.put("order", item.getItemOrder());
                    itemDto.put("questionVersionId", item.getQuestionVersionId());
                    itemDto.put("type", version.getType());
                    itemDto.put("stem", version.getStem());
                    itemDto.put("options", JsonHelper.toMapList(version.getOptionsJson()));
                    return itemDto;
                }).toList();
    }

    private Map<String, Object> wrongBookToDto(WrongBookEntry entry) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", entry.getId());
        dto.put("questionVersionId", entry.getQuestionVersionId());
        dto.put("status", entry.getStatus());
        dto.put("updatedAt", entry.getUpdatedAt());
        return dto;
    }
}
