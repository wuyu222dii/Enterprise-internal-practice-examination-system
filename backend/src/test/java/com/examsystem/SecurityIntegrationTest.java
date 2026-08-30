package com.examsystem;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void examUserCannotAccessAdminDepartments() throws Exception {
        String examToken = TestAuthHelper.loginExam001(mockMvc, objectMapper);
        mockMvc.perform(get("/departments")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void examUserCannotCreateOutageEvent() throws Exception {
        String examToken = TestAuthHelper.loginExam001(mockMvc, objectMapper);
        mockMvc.perform(post("/admin/outage-events")
                        .header("Authorization", "Bearer " + examToken)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"affectedExamIds\":[]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void concurrentOpenReturnsSameInProgressAttempt() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "并发开卷考试");

        String first = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        String second = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        org.assertj.core.api.Assertions.assertThat(second).isEqualTo(first);
    }

    @Test
    void maxAttemptsExhaustedReturns422() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(
                mockMvc,
                objectMapper,
                adminToken,
                "次数用尽考试",
                java.util.List.of(TestExamHelper.ruleLine("qb_demo", "singleChoice", 1)),
                1,
                null
        );
        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        var items = objectMapper.readTree(mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andReturn().getResponse().getContentAsString()).path("data").path("items");
        for (var item : items) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                                    "/attempts/" + attemptId + "/answers/" + item.path("itemId").asText())
                            .header("Authorization", "Bearer " + examToken)
                            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                            .content("{\"answer\":[\"B\"],\"answerVersion\":1}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"manual\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/exams/" + examId + "/attempts")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("ATT_NO_REMAINING_OPPORTUNITY"));
    }
}
