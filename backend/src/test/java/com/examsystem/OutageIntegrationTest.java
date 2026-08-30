package com.examsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.examsystem.modules.exam.ExamService;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
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
class OutageIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ExamAttemptRepository attemptRepository;

    @Autowired
    private ExamService examService;

    @Test
    void detectPausesExamRejectsSaveThenConfirmExtendsOnce() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "故障检测考试");

        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        ExamAttempt before = attemptRepository.findById(attemptId).orElseThrow();
        Instant expiresBefore = before.getExpiresAt();

        MvcResult paper = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andReturn();
        String itemId = objectMapper.readTree(paper.getResponse().getContentAsString())
                .path("data").path("items").get(0).path("itemId").asText();

        MvcResult detect = mockMvc.perform(post("/admin/outage-events/detect")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"affectedExamIds":["%s"],"reason":"injected"}
                                """.formatted(examId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("auto"))
                .andReturn();
        JsonNode event = objectMapper.readTree(detect.getResponse().getContentAsString()).path("data");
        String eventId = event.path("id").asText();
        int version = event.path("latestProposalVersion").asInt();

        mockMvc.perform(put("/attempts/" + attemptId + "/answers/" + itemId)
                        .header("Authorization", "Bearer " + examToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"answer":["B"],"answerVersion":1}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ATT_EXAM_PAUSED"));

        examService.autoSubmitAttempt(attemptId);
        assertThat(attemptRepository.findById(attemptId).orElseThrow().getAttemptStatus())
                .isEqualTo("inProgress");

        mockMvc.perform(post("/admin/outage-events/" + eventId + "/proposals/" + version + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmationNote\":\"补时确认\"}"))
                .andExpect(status().isOk());

        Instant expiresAfter = attemptRepository.findById(attemptId).orElseThrow().getExpiresAt();
        assertThat(expiresAfter).isEqualTo(expiresBefore.plusSeconds(15 * 60));

        mockMvc.perform(post("/admin/outage-events/" + eventId + "/proposals/" + version + "/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmationNote\":\"重复确认\"}"))
                .andExpect(status().isOk());
        assertThat(attemptRepository.findById(attemptId).orElseThrow().getExpiresAt()).isEqualTo(expiresAfter);
    }

    @Test
    void startAttemptWhilePausedReturns403() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "暂停开卷考试");

        mockMvc.perform(post("/admin/exams/" + examId + "/pause")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"manual pause\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/exams/" + examId + "/attempts")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ATT_EXAM_PAUSED"));
    }
}
