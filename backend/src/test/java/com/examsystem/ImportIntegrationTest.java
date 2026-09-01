package com.examsystem;

import com.examsystem.common.ExcelCellHelper;
import com.examsystem.modules.importjob.entity.ImportTask;
import com.examsystem.modules.importjob.repository.ImportTaskRepository;
import com.examsystem.modules.retention.RetentionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ImportIntegrationTest {

    private static final String VALID_OPTIONS = "[{\"key\":\"A\",\"text\":\"1\"},{\"key\":\"B\",\"text\":\"2\"}]";
    private static final String VALID_ANSWER = "[\"B\"]";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ImportTaskRepository importTaskRepository;

    @Autowired
    private RetentionService retentionService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String adminToken;

    @BeforeEach
    void setup() throws Exception {
        adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
    }

    @Test
    void listImportTasksReturnsPage() throws Exception {
        mockMvc.perform(get("/import/tasks?page=1&pageSize=10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void confirmWithStaleTokenReturns409() throws Exception {
        mockMvc.perform(post("/import/tasks/nonexistent/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"confirmToken": "invalid"}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void mixedRowsPreviewThenConfirmIsIdempotent() throws Exception {
        List<String[]> rows = new ArrayList<>();
        rows.add(validRow("混杂合法题"));
        rows.add(new String[] {"badType", "坏题", VALID_OPTIONS, VALID_ANSWER, "easy"});
        MockMultipartFile file = TestExamHelper.questionWorkbook(rows);

        MvcResult created = mockMvc.perform(multipart("/import/tasks")
                        .file(file)
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();
        String taskId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        MvcResult preview = mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importableCount").value(1))
                .andExpect(jsonPath("$.data.errorCount").value(1))
                .andReturn();
        String confirmToken = objectMapper.readTree(preview.getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();
        String idempotencyKey = UUID.randomUUID().toString();

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void fileLevelHeaderRejectReturns422() throws Exception {
        mockMvc.perform(multipart("/import/tasks")
                        .file(wrongHeaderWorkbook())
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("IMP_FILE_INVALID"));
    }

    @Test
    void thousandMixedRowsStayWithinLimit() throws Exception {
        List<String[]> rows = new ArrayList<>(1000);
        for (int i = 0; i < 1000; i++) {
            if (i % 2 == 0) {
                rows.add(validRow("千行题 " + i));
            } else {
                rows.add(new String[] {"", "空类型", VALID_OPTIONS, VALID_ANSWER, "easy"});
            }
        }
        mockMvc.perform(multipart("/import/tasks")
                        .file(TestExamHelper.questionWorkbook(rows))
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.importableCount").value(500))
                .andExpect(jsonPath("$.data.errorCount").value(500));
    }

    @Test
    void concurrentConfirmOneSucceeds() throws Exception {
        MockMultipartFile file = TestExamHelper.questionWorkbook(List.<String[]>of(validRow("并发确认题")));
        MvcResult created = mockMvc.perform(multipart("/import/tasks")
                        .file(file)
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();
        String taskId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();
        String confirmToken = objectMapper.readTree(mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn().getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger conflict = new AtomicInteger();
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    try {
                        start.await();
                        int status = mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                                        .header("Authorization", "Bearer " + adminToken)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                                .andReturn()
                                .getResponse()
                                .getStatus();
                        if (status == 200) {
                            ok.incrementAndGet();
                        } else if (status == 409) {
                            conflict.incrementAndGet();
                        }
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }));
            }
            start.countDown();
            for (Future<?> future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(ok.get()).isEqualTo(1);
        assertThat(conflict.get()).isEqualTo(1);
    }

    @Test
    void expiredImportTaskCannotConfirm() throws Exception {
        MvcResult created = mockMvc.perform(multipart("/import/tasks")
                        .file(TestExamHelper.questionWorkbook(List.<String[]>of(validRow("过期任务题"))))
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();
        String taskId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();
        String confirmToken = objectMapper.readTree(mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn().getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();

        jdbcTemplate.update(
                "UPDATE import_tasks SET created_at = ? WHERE id = ?",
                Timestamp.from(Instant.now().minus(31, ChronoUnit.DAYS)),
                taskId
        );
        ImportTask reloaded = importTaskRepository.findById(taskId).orElseThrow();
        reloaded.setCreatedAt(Instant.now().minus(31, ChronoUnit.DAYS));
        importTaskRepository.save(reloaded);

        retentionService.purgeExpired();

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void excelFormulaPrefixIsEscaped() {
        assertThat(ExcelCellHelper.sanitize("=CMD")).startsWith("'");
        assertThat(ExcelCellHelper.sanitize("正常姓名")).isEqualTo("正常姓名");
    }

    @Test
    void legacyChineseBankPreviewThenConfirmCreatesCategory() throws Exception {
        String bankName = "历史题库导入-" + UUID.randomUUID();
        MvcResult createdBank = mockMvc.perform(post("/question-banks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + bankName + "\",\"practiceEnabled\":true,\"mockEnabled\":true}"))
                .andExpect(status().isCreated())
                .andReturn();
        String bankId = objectMapper.readTree(createdBank.getResponse().getContentAsString())
                .path("data").path("id").asText();

        MockMultipartFile file = legacyQuestionWorkbook();
        MvcResult created = mockMvc.perform(multipart("/import/tasks")
                        .file(file)
                        .param("questionBankId", bankId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.importableCount").value(3))
                .andExpect(jsonPath("$.data.errorCount").value(0))
                .andReturn();
        String taskId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        MvcResult preview = mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pendingHierarchy.categories").isArray())
                .andReturn();
        String confirmToken = objectMapper.readTree(preview.getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                .andExpect(status().isUnprocessableEntity());

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"confirmToken":"%s","confirmPendingHierarchy":true}
                                """.formatted(confirmToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/question-banks/" + bankId + "/categories")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name").value(org.hamcrest.Matchers.hasItems("烟花爆竹", "企业主要负责人")));
        mockMvc.perform(get("/question-banks/" + bankId + "/questions?page=1&pageSize=10")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(3));
    }

    @Test
    void duplicateAndConflictRowsStayInErrorReport() throws Exception {
        String stem = "重复冲突题-" + UUID.randomUUID();
        List<String[]> rows = List.of(
                validRow(stem),
                validRow(stem),
                new String[] {
                        "singleChoice",
                        stem,
                        "[{\"key\":\"A\",\"text\":\"1\"},{\"key\":\"B\",\"text\":\"2\"}]",
                        "[\"A\"]",
                        "easy"
                }
        );
        mockMvc.perform(multipart("/import/tasks")
                        .file(TestExamHelper.questionWorkbook(rows))
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.importableCount").value(1))
                .andExpect(jsonPath("$.data.errorCount").value(2));
    }

    @Test
    void revalidateRereadsFileAndRotatesConfirmToken() throws Exception {
        MockMultipartFile file = TestExamHelper.questionWorkbook(List.<String[]>of(validRow("重新校验题-" + UUID.randomUUID())));
        MvcResult created = mockMvc.perform(multipart("/import/tasks")
                        .file(file)
                        .param("questionBankId", "qb_demo")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();
        String taskId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();
        String oldToken = objectMapper.readTree(mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn().getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();

        mockMvc.perform(post("/import/tasks/" + taskId + "/revalidate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        String newToken = objectMapper.readTree(mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("preview_ready"))
                .andExpect(jsonPath("$.data.importableCount").value(1))
                .andReturn().getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();
        assertThat(newToken).isNotBlank().isNotEqualTo(oldToken);

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + oldToken + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("IMP_PREVIEW_STALE"));

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + newToken + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void confirmMarksNeedsRevalidationWhenBankGainsSameQuestion() throws Exception {
        String stem = "确认前变题-" + UUID.randomUUID();
        MvcResult createdBank = mockMvc.perform(post("/question-banks")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"revalidate-bank-" + UUID.randomUUID() + "\",\"practiceEnabled\":false,\"mockEnabled\":false}"))
                .andExpect(status().isCreated())
                .andReturn();
        String bankId = objectMapper.readTree(createdBank.getResponse().getContentAsString())
                .path("data").path("id").asText();
        String categoryId = objectMapper.readTree(mockMvc.perform(post("/question-banks/" + bankId + "/categories")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"通用\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString())
                .path("data").path("id").asText();

        MvcResult created = mockMvc.perform(multipart("/import/tasks")
                        .file(TestExamHelper.questionWorkbook(List.<String[]>of(validRow(stem))))
                        .param("questionBankId", bankId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.importableCount").value(1))
                .andReturn();
        String taskId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();
        String confirmToken = objectMapper.readTree(mockMvc.perform(get("/import/tasks/" + taskId + "/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn().getResponse().getContentAsString())
                .path("data").path("confirmToken").asText();

        mockMvc.perform(post("/question-banks/" + bankId + "/questions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "categoryId": "%s",
                                  "version": {
                                    "type": "singleChoice",
                                    "stem": "%s",
                                    "options": [{"key":"A","text":"1"},{"key":"B","text":"2"}],
                                    "standardAnswer": ["B"],
                                    "difficulty": "easy"
                                  }
                                }
                                """.formatted(categoryId, stem)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/import/tasks/" + taskId + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmToken\":\"" + confirmToken + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("IMP_PREVIEW_STALE"));

        mockMvc.perform(get("/import/tasks/" + taskId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("needs_revalidation"));
    }

    @Test
    void listTasksCanFilterByStatus() throws Exception {
        mockMvc.perform(get("/import/tasks?page=1&pageSize=10&status=completed")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isArray());
    }

    private static String[] validRow(String stem) {
        return new String[] {"singleChoice", stem, VALID_OPTIONS, VALID_ANSWER, "easy"};
    }

    private static MockMultipartFile legacyQuestionWorkbook() throws Exception {
        try (var workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             var out = new java.io.ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("烟花爆竹");
            var header = sheet.createRow(0);
            String[] names = {"一级科目", "二级科目", "三级科目", "题型", "难易度", "题目内容", "正确答案", "答案选项数量", "试题类型"};
            for (int i = 0; i < names.length; i++) {
                header.createCell(i).setCellValue(names[i]);
            }
            var hint = sheet.createRow(1);
            hint.createCell(0).setCellValue("必填，一级目录。");
            hint.createCell(3).setCellValue("必填，只能填写“判断、单选、多选”其中之一");
            var r1 = sheet.createRow(2);
            r1.createCell(2).setCellValue("烟花爆竹");
            r1.createCell(3).setCellValue("单选");
            r1.createCell(4).setCellValue("简单");
            r1.createCell(5).setCellValue("批发企业应当（）。\nA及时销毁\nB立即停售\nC自行封存\nD分类存放");
            r1.createCell(6).setCellValue("A");
            r1.createCell(7).setCellValue("4");
            var r2 = sheet.createRow(3);
            r2.createCell(0).setCellValue("企业主要负责人");
            r2.createCell(1).setCellValue("一般行业");
            r2.createCell(3).setCellValue("多选");
            r2.createCell(4).setCellValue("中");
            r2.createCell(5).setCellValue("必须执行（）标准。\nA．国家\nB．地方\nC．行业\nD．合同约定");
            r2.createCell(6).setCellValue("AC");
            r2.createCell(7).setCellValue("4");
            var r3 = sheet.createRow(4);
            r3.createCell(2).setCellValue("烟花爆竹");
            r3.createCell(3).setCellValue("判断");
            r3.createCell(4).setCellValue("一般");
            r3.createCell(5).setCellValue("零售经营者不得采购礼花弹。");
            r3.createCell(6).setCellValue("对");
            r3.createCell(7).setCellValue("2");
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "题库.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );
        }
    }

    private static MockMultipartFile wrongHeaderWorkbook() throws Exception {
        try (var workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             var out = new java.io.ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("questions");
            var header = sheet.createRow(0);
            header.createCell(0).setCellValue("wrong");
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "bad.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );
        }
    }
}
