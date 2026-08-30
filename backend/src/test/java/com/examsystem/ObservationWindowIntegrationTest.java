package com.examsystem;

import com.examsystem.modules.exam.ExamService;
import com.examsystem.modules.exam.entity.Exam;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ObservationWindowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ExamAttemptRepository attemptRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private ExamService examService;

    @Test
    void expiredAttemptIsReadOnlyUntilObservationEndsThenTimeoutSubmits() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "观察窗考试");
        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);

        MvcResult paper = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andReturn();
        String itemId = objectMapper.readTree(paper.getResponse().getContentAsString())
                .path("data").path("items").get(0).path("itemId").asText();

        ExamAttempt attempt = attemptRepository.findById(attemptId).orElseThrow();
        Instant now = Instant.now();
        attempt.setExpiresAt(now.minusSeconds(2));
        attemptRepository.save(attempt);

        mockMvc.perform(put("/attempts/" + attemptId + "/answers/" + itemId)
                        .header("Authorization", "Bearer " + examToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"answer":["A"],"answerVersion":1}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ANS_IN_OBSERVATION"));

        mockMvc.perform(post("/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"manual\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ANS_IN_OBSERVATION"));

        mockMvc.perform(get("/attempts/" + attemptId)
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.inObservation").value(true))
                .andExpect(jsonPath("$.data.timing.remainingSeconds").value(0));

        examService.autoSubmitAttempt(attemptId);
        assertThat(attemptRepository.findById(attemptId).orElseThrow().getAttemptStatus())
                .isEqualTo("inProgress");

        attempt = attemptRepository.findById(attemptId).orElseThrow();
        attempt.setExpiresAt(now.minusSeconds(25));
        attemptRepository.save(attempt);
        examService.autoSubmitAttempt(attemptId);
        assertThat(attemptRepository.findById(attemptId).orElseThrow().getAttemptStatus())
                .isEqualTo("completed");
        assertThat(attemptRepository.findById(attemptId).orElseThrow().getSubmitReason())
                .isEqualTo("timeout");
    }

    @Test
    void wrappingLifecycleStaysClosingThenAdvancesToEnded() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "收尾观察考试");

        Exam exam = examRepository.findById(examId).orElseThrow();
        exam.setStopAttemptAt(Instant.now().minusSeconds(2));
        examRepository.save(exam);

        mockMvc.perform(get("/exams/" + examId)
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lifecycle").value("closing"))
                .andExpect(jsonPath("$.data.endBlockReason").value("observation"));

        mockMvc.perform(post("/exams/" + examId + "/attempts")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("ATT_WINDOW_CLOSED"));

        examService.advanceExamLifecycles();
        assertThat(examRepository.findById(examId).orElseThrow().getLifecycle()).isEqualTo("openForAttempt");

        exam = examRepository.findById(examId).orElseThrow();
        exam.setStopAttemptAt(Instant.now().minusSeconds(25));
        examRepository.save(exam);
        examService.advanceExamLifecycles();
        assertThat(examRepository.findById(examId).orElseThrow().getLifecycle()).isEqualTo("ended");

        mockMvc.perform(get("/exams/" + examId)
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lifecycle").value("ended"));
    }

    @Test
    void startAttemptBeforeOpenReturnsNotStarted() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "未开始考试");

        Exam exam = examRepository.findById(examId).orElseThrow();
        exam.setOpenStartAt(Instant.now().plusSeconds(3600));
        examRepository.save(exam);

        mockMvc.perform(get("/exams/" + examId)
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.lifecycle").value("notStarted"));

        mockMvc.perform(post("/exams/" + examId + "/attempts")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("ATT_NOT_STARTED"));
    }

    @Test
    void cancelledResultShowsEmployeeVisibleReasonWithoutScores() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "取消披露考试");
        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);

        mockMvc.perform(post("/admin/exams/" + examId + "/cancel")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"employeeVisibleReason":"本场因安排调整取消","internalReason":"内部调度"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/attempts/" + attemptId + "/result")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.resultState").value("cancelled"))
                .andExpect(jsonPath("$.data.cancelNotice").value("本场因安排调整取消"))
                .andExpect(jsonPath("$.data.visibility.summaryVisible").value(false))
                .andExpect(jsonPath("$.data.totalScore").doesNotExist());
    }
}
