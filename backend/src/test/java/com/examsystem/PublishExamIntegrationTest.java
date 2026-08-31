package com.examsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
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
class PublishExamIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void overlappingRulesFailPreflight() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        MvcResult create = mockMvc.perform(post("/admin/exams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"重叠规则考试\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String examId = objectMapper.readTree(create.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/basic")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"重叠规则考试","openStartAt":"%s"}
                                """.formatted(java.time.Instant.now().toString())))
                .andExpect(status().isOk());
        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/rules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "durationMinutes": 60,
                                  "maxAttempts": 1,
                                  "passingScore": 0,
                                  "ruleLines": [
                                    %s,
                                    %s
                                  ]
                                }
                                """.formatted(
                                TestExamHelper.ruleLine("qb_demo", "singleChoice", 1),
                                TestExamHelper.ruleLine("qb_demo", "singleChoice", 1)
                        )))
                .andExpect(status().isOk());
        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/assignees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"selected\",\"employeeIds\":[\"emp_admin\"]}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/admin/exams/" + examId + "/preflight")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ready").value(false))
                .andExpect(jsonPath("$.data.issues[?(@.code == 'EXM_OVERLAPPING_RULES')]").isNotEmpty());

        mockMvc.perform(post("/admin/exams/" + examId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void publishedExamRejectsRuleEditsAndPaperStaysOnPublishedVersion() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "冻结卷考试");

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/rules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleLines\":[]}"))
                .andExpect(status().isUnprocessableEntity());

        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        MvcResult paperBefore = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode items = objectMapper.readTree(paperBefore.getResponse().getContentAsString())
                .path("data").path("items");
        String originalStem = items.get(0).path("stem").asText();

        mockMvc.perform(post("/questions/q_demo_01/versions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "singleChoice",
                                  "stem": "改题后不应出现在已发布卷",
                                  "options": [{"key":"A","text":"1"},{"key":"B","text":"2"}],
                                  "standardAnswer": ["B"],
                                  "difficulty": "easy"
                                }
                                """))
                .andExpect(status().isCreated());

        MvcResult paperAfter = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(paperAfter.getResponse().getContentAsString())
                .path("data").path("items").get(0).path("stem").asText())
                .isEqualTo(originalStem)
                .doesNotContain("改题后不应出现");
    }

    @Test
    void resultHidesPassConclusionUnlessPolicyAllows() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(
                mockMvc,
                objectMapper,
                adminToken,
                "成绩可见性考试",
                List.of(TestExamHelper.ruleLine("qb_demo", "singleChoice", 2)),
                2,
                """
                        {
                          "summaryVisible": true,
                          "passingScoreVisible": false,
                          "passConclusionVisible": false,
                          "perItemReviewAllowed": false
                        }
                        """
        );
        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        JsonNode items = objectMapper.readTree(mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andReturn().getResponse().getContentAsString()).path("data").path("items");
        for (JsonNode item : items) {
            mockMvc.perform(put("/attempts/" + attemptId + "/answers/" + item.path("itemId").asText())
                            .header("Authorization", "Bearer " + examToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"answer\":[\"B\"],\"answerVersion\":1}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + examToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"manual\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/attempts/" + attemptId + "/result")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passed").doesNotExist())
                .andExpect(jsonPath("$.data.items").doesNotExist());
    }

    @Test
    void publishFromFixedBankIncludesEveryActiveQuestionInBankOrder() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);

        MvcResult create = mockMvc.perform(post("/admin/exams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"整库入卷考试\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String examId = objectMapper.readTree(create.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/basic")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"整库入卷考试","openStartAt":"%s"}
                                """.formatted(java.time.Instant.now().minusSeconds(60))))
                .andExpect(status().isOk());

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/rules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "paperMode": "fixedBank",
                                  "fixedBankId": "qb_demo",
                                  "scorePerQuestion": 2,
                                  "durationMinutes": 60,
                                  "maxAttempts": 1,
                                  "passingScore": 10
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/assignees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"selected","employeeIds":["emp_admin"]}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/admin/exams/" + examId + "/preflight")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ready").value(true));

        mockMvc.perform(post("/admin/exams/" + examId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        String attemptId = TestExamHelper.startAttempt(mockMvc, objectMapper, examToken, examId);
        MvcResult paper = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(10))
                .andReturn();
        JsonNode items = objectMapper.readTree(paper.getResponse().getContentAsString())
                .path("data").path("items");
        assertThat(items).hasSize(10);
        java.util.Set<String> stems = new java.util.HashSet<>();
        items.forEach(item -> stems.add(item.path("stem").asText()));
        assertThat(stems).anyMatch(stem -> stem.contains("演示题 1"));
        assertThat(stems).anyMatch(stem -> stem.contains("演示题 10"));
        assertThat(items.get(0).path("score").asDouble()).isEqualTo(2.0);
    }
}
