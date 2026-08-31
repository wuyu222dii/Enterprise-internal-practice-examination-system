package com.examsystem.modules.question;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.modules.audit.AuditService;
import com.examsystem.modules.question.dto.CreateQuestionBankRequest;
import com.examsystem.modules.question.dto.CreateQuestionRequest;
import com.examsystem.modules.question.dto.CopyQuestionRequest;
import com.examsystem.modules.question.dto.QuestionVersionInput;
import com.examsystem.modules.question.dto.UpdateQuestionBankRequest;
import com.examsystem.modules.question.entity.Category;
import com.examsystem.modules.question.entity.KnowledgePoint;
import com.examsystem.modules.question.entity.Question;
import com.examsystem.modules.question.entity.QuestionBank;
import com.examsystem.modules.question.entity.QuestionVersion;
import com.examsystem.modules.question.repository.CategoryRepository;
import com.examsystem.modules.question.repository.KnowledgePointRepository;
import com.examsystem.modules.question.repository.QuestionBankRepository;
import com.examsystem.modules.question.repository.QuestionRepository;
import com.examsystem.modules.question.repository.QuestionVersionRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QuestionService {

    private final QuestionBankRepository questionBankRepository;
    private final CategoryRepository categoryRepository;
    private final KnowledgePointRepository knowledgePointRepository;
    private final QuestionRepository questionRepository;
    private final QuestionVersionRepository questionVersionRepository;
    private final AuditService auditService;

    public QuestionService(
            QuestionBankRepository questionBankRepository,
            CategoryRepository categoryRepository,
            KnowledgePointRepository knowledgePointRepository,
            QuestionRepository questionRepository,
            QuestionVersionRepository questionVersionRepository,
            AuditService auditService
    ) {
        this.questionBankRepository = questionBankRepository;
        this.categoryRepository = categoryRepository;
        this.knowledgePointRepository = knowledgePointRepository;
        this.questionRepository = questionRepository;
        this.questionVersionRepository = questionVersionRepository;
        this.auditService = auditService;
    }

    public List<Map<String, Object>> listBanks() {
        SecurityUtils.requireAdmin();
        return questionBankRepository.findAll().stream().map(this::bankToDto).toList();
    }

    @Transactional
    public Map<String, Object> createBank(CreateQuestionBankRequest request) {
        SecurityUtils.requireAdmin();
        QuestionBank bank = new QuestionBank();
        bank.setId(IdGenerator.newId("qb"));
        bank.setName(request.name());
        bank.setPracticeEnabled(request.practiceEnabled() != null && request.practiceEnabled());
        bank.setMockEnabled(request.mockEnabled() != null && request.mockEnabled());
        questionBankRepository.save(bank);
        return bankToDto(bank);
    }

    @Transactional
    public Map<String, Object> updateBank(String id, UpdateQuestionBankRequest request) {
        SecurityUtils.requireAdmin();
        QuestionBank bank = getBank(id);
        if (request.name() != null) {
            bank.setName(request.name());
        }
        if (request.status() != null) {
            bank.setStatus(request.status());
        }
        if (request.practiceEnabled() != null) {
            bank.setPracticeEnabled(request.practiceEnabled());
        }
        if (request.mockEnabled() != null) {
            bank.setMockEnabled(request.mockEnabled());
        }
        questionBankRepository.save(bank);
        return bankToDto(bank);
    }

    public List<Map<String, Object>> listPracticeTaxonomy(String bankId) {
        QuestionBank bank = requireActiveBank(bankId);
        if (!bank.isPracticeEnabled()) {
            throw BusinessException.of(ErrorCode.QST_BANK_DISABLED, "题库未开放练习", 422);
        }
        List<Map<String, Object>> categories = new ArrayList<>();
        for (Category category : categoryRepository.findByQuestionBankIdOrderByNameAsc(bankId)) {
            Map<String, Object> dto = categoryToDto(category);
            dto.put("knowledgePoints", knowledgePointRepository.findByCategoryIdOrderByNameAsc(category.getId())
                    .stream().map(this::kpToDto).toList());
            categories.add(dto);
        }
        return categories;
    }

    public List<Map<String, Object>> listCategories(String bankId) {
        SecurityUtils.requireAdmin();
        getBank(bankId);
        return categoryRepository.findByQuestionBankIdOrderByNameAsc(bankId).stream()
                .map(this::categoryToDto).toList();
    }

    @Transactional
    public Map<String, Object> createCategory(String bankId, String name) {
        SecurityUtils.requireAdmin();
        getBank(bankId);
        categoryRepository.findByQuestionBankIdAndName(bankId, name).ifPresent(c -> {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "分类名称重复", 422);
        });
        Category category = new Category();
        category.setId(IdGenerator.newId("cat"));
        category.setQuestionBankId(bankId);
        category.setName(name);
        categoryRepository.save(category);
        return categoryToDto(category);
    }

    @Transactional
    public void updateCategory(String id, String name) {
        SecurityUtils.requireAdmin();
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "分类不存在", 404));
        category.setName(name);
        categoryRepository.save(category);
    }

    public List<Map<String, Object>> listKnowledgePoints(String categoryId) {
        SecurityUtils.requireAdmin();
        return knowledgePointRepository.findByCategoryIdOrderByNameAsc(categoryId).stream()
                .map(this::kpToDto).toList();
    }

    @Transactional
    public Map<String, Object> createKnowledgePoint(String categoryId, String name) {
        SecurityUtils.requireAdmin();
        KnowledgePoint kp = new KnowledgePoint();
        kp.setId(IdGenerator.newId("kp"));
        kp.setCategoryId(categoryId);
        kp.setName(name);
        knowledgePointRepository.save(kp);
        return kpToDto(kp);
    }

    @Transactional
    public void updateKnowledgePoint(String id, String name) {
        SecurityUtils.requireAdmin();
        KnowledgePoint kp = knowledgePointRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "知识点不存在", 404));
        kp.setName(name);
        knowledgePointRepository.save(kp);
    }

    public PageDto<Map<String, Object>> listQuestions(String bankId, int page, int pageSize) {
        SecurityUtils.requireAdmin();
        Page<Question> result = questionRepository.findByQuestionBankId(bankId, PageRequest.of(page - 1, pageSize));
        Map<String, String> latestVersionIds = loadLatestVersionIds(result.getContent());
        List<Map<String, Object>> items = result.getContent().stream()
                .map(q -> questionToDto(q, latestVersionIds.get(q.getId())))
                .toList();
        return new PageDto<>(items, result.getTotalElements(), page, pageSize);
    }

    @Transactional
    public Map<String, Object> createQuestion(String bankId, CreateQuestionRequest request) {
        SecurityUtils.requireAdmin();
        getBank(bankId);
        Question question = new Question();
        question.setId(IdGenerator.newId("q"));
        question.setQuestionBankId(bankId);
        question.setCategoryId(request.categoryId());
        question.setKnowledgePointId(request.knowledgePointId());
        questionRepository.save(question);

        QuestionVersion version = createVersionEntity(question.getId(), 1, request.version());
        questionVersionRepository.save(version);
        return questionToDto(question);
    }

    @Transactional
    public Map<String, Object> copyQuestion(String sourceId, CopyQuestionRequest request) {
        SecurityUtils.requireAdmin();
        Question source = getQuestionEntity(sourceId);
        QuestionBank targetBank = requireActiveBank(request.targetBankId());
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "分类不存在", 404));
        if (!targetBank.getId().equals(category.getQuestionBankId())) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "分类不属于目标题库", 422);
        }
        String knowledgePointId = blankToNull(request.knowledgePointId());
        if (knowledgePointId != null) {
            KnowledgePoint knowledgePoint = knowledgePointRepository.findById(knowledgePointId)
                    .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "知识点不存在", 404));
            if (!category.getId().equals(knowledgePoint.getCategoryId())) {
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "知识点不属于所选分类", 422);
            }
        }
        QuestionVersion latest = questionVersionRepository.findTopByQuestionIdOrderByVersionNoDesc(sourceId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "题目没有可复制的版本", 404));

        Question copy = new Question();
        copy.setId(IdGenerator.newId("q"));
        copy.setQuestionBankId(targetBank.getId());
        copy.setCategoryId(category.getId());
        copy.setKnowledgePointId(knowledgePointId);
        copy.setStatus("active");
        questionRepository.save(copy);

        QuestionVersionInput input = new QuestionVersionInput(
                latest.getType(),
                latest.getStem(),
                JsonHelper.toMapList(latest.getOptionsJson()),
                JsonHelper.toStringList(latest.getStandardAnswer()),
                latest.getExplanation(),
                latest.getDifficulty(),
                latest.getDefaultScore()
        );
        QuestionVersion version = createVersionEntity(copy.getId(), 1, input);
        questionVersionRepository.save(version);
        auditService.log(
                "question.copy",
                "Question",
                copy.getId(),
                Map.of("sourceQuestionId", source.getId()),
                Map.of("id", copy.getId(), "questionBankId", copy.getQuestionBankId()),
                null
        );
        return questionToDto(copy);
    }

    public Map<String, Object> getQuestion(String id) {
        SecurityUtils.requireAdmin();
        return questionToDto(getQuestionEntity(id));
    }

    @Transactional
    public void updateQuestion(String id, String status, String categoryId, String knowledgePointId) {
        SecurityUtils.requireAdmin();
        Question question = getQuestionEntity(id);
        if (status != null) {
            question.setStatus(status);
        }
        if (categoryId != null) {
            question.setCategoryId(categoryId);
        }
        if (knowledgePointId != null) {
            question.setKnowledgePointId(knowledgePointId);
        }
        questionRepository.save(question);
    }

    public List<Map<String, Object>> listVersions(String questionId) {
        SecurityUtils.requireAdmin();
        return questionVersionRepository.findByQuestionIdOrderByVersionNoDesc(questionId).stream()
                .map(this::versionToDto).toList();
    }

    @Transactional
    public Map<String, Object> createVersion(String questionId, QuestionVersionInput input) {
        SecurityUtils.requireAdmin();
        getQuestionEntity(questionId);
        int nextVersion = questionVersionRepository.findTopByQuestionIdOrderByVersionNoDesc(questionId)
                .map(v -> v.getVersionNo() + 1).orElse(1);
        QuestionVersion version = createVersionEntity(questionId, nextVersion, input);
        questionVersionRepository.save(version);
        return versionToDto(version);
    }

    public Map<String, Object> getVersion(String versionId) {
        SecurityUtils.requireAdmin();
        QuestionVersion version = questionVersionRepository.findById(versionId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "版本不存在", 404));
        return versionToDto(version);
    }

    public QuestionVersion requireVersion(String versionId) {
        return questionVersionRepository.findById(versionId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "题目版本不存在", 404));
    }

    /**
     * Batch counterpart of {@link #requireVersion}. Paper rendering and scoring touch every item of a
     * 100-question paper, so they must not issue one query per item.
     */
    public Map<String, QuestionVersion> requireVersions(Collection<String> versionIds) {
        if (versionIds.isEmpty()) {
            return Map.of();
        }
        Map<String, QuestionVersion> versions = new HashMap<>();
        for (QuestionVersion version : questionVersionRepository.findAllById(versionIds)) {
            versions.put(version.getId(), version);
        }
        for (String versionId : versionIds) {
            if (!versions.containsKey(versionId)) {
                throw BusinessException.of(ErrorCode.NOT_FOUND, "题目版本不存在: " + versionId, 404);
            }
        }
        return versions;
    }

    public Question requireQuestion(String questionId) {
        return getQuestionEntity(questionId);
    }

    public QuestionBank requireActiveBank(String bankId) {
        QuestionBank bank = getBank(bankId);
        if (!"active".equals(bank.getStatus())) {
            throw BusinessException.of(ErrorCode.QST_BANK_DISABLED, "题库已停用", 422);
        }
        return bank;
    }

    @Transactional
    public String getOrCreateDefaultCategory(String bankId) {
        SecurityUtils.requireAdmin();
        getBank(bankId);
        return categoryRepository.findByQuestionBankIdAndName(bankId, "导入默认")
                .map(Category::getId)
                .orElseGet(() -> {
                    Category category = new Category();
                    category.setId(IdGenerator.newId("cat"));
                    category.setQuestionBankId(bankId);
                    category.setName("导入默认");
                    categoryRepository.save(category);
                    return category.getId();
                });
    }

    public boolean categoryExists(String bankId, String name) {
        return categoryRepository.findByQuestionBankIdAndName(bankId, name).isPresent();
    }

    public boolean knowledgePointExists(String bankId, String categoryName, String knowledgePointName) {
        return categoryRepository.findByQuestionBankIdAndName(bankId, categoryName)
                .flatMap(category -> knowledgePointRepository.findByCategoryIdAndName(category.getId(), knowledgePointName))
                .isPresent();
    }

    @Transactional
    public String getOrCreateCategory(String bankId, String name) {
        SecurityUtils.requireAdmin();
        getBank(bankId);
        return categoryRepository.findByQuestionBankIdAndName(bankId, name)
                .map(Category::getId)
                .orElseGet(() -> {
                    Category category = new Category();
                    category.setId(IdGenerator.newId("cat"));
                    category.setQuestionBankId(bankId);
                    category.setName(name);
                    categoryRepository.save(category);
                    return category.getId();
                });
    }

    @Transactional
    public String getOrCreateKnowledgePoint(String categoryId, String name) {
        SecurityUtils.requireAdmin();
        return knowledgePointRepository.findByCategoryIdAndName(categoryId, name)
                .map(KnowledgePoint::getId)
                .orElseGet(() -> {
                    KnowledgePoint knowledgePoint = new KnowledgePoint();
                    knowledgePoint.setId(IdGenerator.newId("kp"));
                    knowledgePoint.setCategoryId(categoryId);
                    knowledgePoint.setName(name);
                    knowledgePointRepository.save(knowledgePoint);
                    return knowledgePoint.getId();
                });
    }

    public List<QuestionVersion> findActiveVersionsByBank(String bankId) {
        return questionVersionRepository.findLatestActiveByBankAndScope(bankId, null, null);
    }

    /**
     * Ids of the drawable candidate versions in a bank, optionally restricted to one question type.
     */
    public List<String> findActiveVersionIdsByBank(String bankId, String type) {
        return questionVersionRepository.findLatestActiveIdsByBankAndType(bankId, blankToNull(type));
    }

    public List<QuestionVersion> findActiveVersionsByScope(String bankId, String categoryId, String knowledgePointId) {
        return questionVersionRepository.findLatestActiveByBankAndScope(
                bankId, blankToNull(categoryId), blankToNull(knowledgePointId));
    }

    /**
     * Batch lookup of the owning questions for a set of versions, keyed by question id.
     */
    public Map<String, Question> findQuestionsByIds(Collection<String> questionIds) {
        if (questionIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Question> questions = new HashMap<>();
        for (Question question : questionRepository.findAllById(questionIds)) {
            questions.put(question.getId(), question);
        }
        return questions;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private QuestionVersion createVersionEntity(String questionId, int versionNo, QuestionVersionInput input) {
        QuestionVersion version = new QuestionVersion();
        version.setId(IdGenerator.newId("qv"));
        version.setQuestionId(questionId);
        version.setVersionNo(versionNo);
        version.setType(input.type());
        version.setStem(input.stem());
        version.setOptionsJson(JsonHelper.toJson(input.options() != null ? input.options() : List.of()));
        version.setStandardAnswer(JsonHelper.toJson(input.standardAnswer()));
        version.setExplanation(input.explanation());
        version.setDifficulty(input.difficulty() != null ? input.difficulty() : "medium");
        version.setDefaultScore(input.defaultScore() != null ? input.defaultScore() : java.math.BigDecimal.ONE);
        return version;
    }

    private QuestionBank getBank(String id) {
        return questionBankRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "题库不存在", 404));
    }

    private Question getQuestionEntity(String id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "题目不存在", 404));
    }

    private Map<String, Object> bankToDto(QuestionBank bank) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", bank.getId());
        dto.put("name", bank.getName());
        dto.put("status", bank.getStatus());
        dto.put("practiceEnabled", bank.isPracticeEnabled());
        dto.put("mockEnabled", bank.isMockEnabled());
        dto.put("activeQuestionCount", questionRepository.countByQuestionBankIdAndStatus(bank.getId(), "active"));
        dto.put("createdAt", bank.getCreatedAt());
        return dto;
    }

    private Map<String, Object> categoryToDto(Category c) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", c.getId());
        dto.put("questionBankId", c.getQuestionBankId());
        dto.put("name", c.getName());
        return dto;
    }

    private Map<String, Object> kpToDto(KnowledgePoint kp) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", kp.getId());
        dto.put("categoryId", kp.getCategoryId());
        dto.put("name", kp.getName());
        return dto;
    }

    private Map<String, String> loadLatestVersionIds(List<Question> questions) {
        if (questions.isEmpty()) {
            return Map.of();
        }
        List<String> questionIds = questions.stream().map(Question::getId).toList();
        Map<String, String> latest = new HashMap<>();
        for (QuestionVersion version : questionVersionRepository.findLatestByQuestionIds(questionIds)) {
            latest.put(version.getQuestionId(), version.getId());
        }
        return latest;
    }

    private Map<String, Object> questionToDto(Question q) {
        return questionToDto(q, questionVersionRepository.findTopByQuestionIdOrderByVersionNoDesc(q.getId())
                .map(QuestionVersion::getId)
                .orElse(null));
    }

    private Map<String, Object> questionToDto(Question q, String latestVersionId) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", q.getId());
        dto.put("questionBankId", q.getQuestionBankId());
        dto.put("categoryId", q.getCategoryId());
        dto.put("knowledgePointId", q.getKnowledgePointId());
        dto.put("status", q.getStatus());
        if (latestVersionId != null) {
            dto.put("latestVersionId", latestVersionId);
        }
        return dto;
    }

    public Map<String, Object> versionToDto(QuestionVersion v) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", v.getId());
        dto.put("questionId", v.getQuestionId());
        dto.put("versionNo", v.getVersionNo());
        dto.put("type", v.getType());
        dto.put("stem", v.getStem());
        dto.put("options", JsonHelper.toMapList(v.getOptionsJson()));
        dto.put("standardAnswer", JsonHelper.toStringList(v.getStandardAnswer()));
        dto.put("explanation", v.getExplanation());
        dto.put("difficulty", v.getDifficulty());
        dto.put("defaultScore", v.getDefaultScore());
        dto.put("status", v.getStatus());
        dto.put("createdAt", v.getCreatedAt());
        return dto;
    }
}
