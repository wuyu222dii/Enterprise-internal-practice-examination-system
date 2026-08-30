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
                .andExpect(status().isUnprocessableEntity());
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

    private static String[] validRow(String stem) {
        return new String[] {"singleChoice", stem, VALID_OPTIONS, VALID_ANSWER, "easy"};
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
