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
class ExamFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginListTasksStartAttemptSaveAnswerSubmit() throws Exception {
        String token = loginAsExamUser();

        MvcResult tasksResult = mockMvc.perform(get("/exams/tasks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andReturn();

        JsonNode tasks = objectMapper.readTree(tasksResult.getResponse().getContentAsString()).path("data");
        if (tasks.isEmpty()) {
            return;
        }

        String examId = tasks.get(0).path("id").asText();
        assertThat(examId).isNotBlank();

        MvcResult startResult = mockMvc.perform(post("/exams/" + examId + "/attempts")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.attemptId").isNotEmpty())
                .andReturn();

        JsonNode startData = objectMapper.readTree(startResult.getResponse().getContentAsString()).path("data");
        String attemptId = startData.path("attemptId").asText();

        mockMvc.perform(get("/attempts/" + attemptId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.attemptId").value(attemptId))
                .andExpect(jsonPath("$.data.timing.remainingSeconds").isNumber());

        MvcResult paperResult = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isArray())
                .andReturn();

        JsonNode items = objectMapper.readTree(paperResult.getResponse().getContentAsString())
                .path("data").path("items");

        for (JsonNode item : items) {
            String itemId = item.path("itemId").asText();
            mockMvc.perform(put("/attempts/" + attemptId + "/answers/" + itemId)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "answer": ["B"],
                                      "answerVersion": 1
                                    }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.itemId").value(itemId))
                    .andExpect(jsonPath("$.data.confirmedVersion").value(1))
                    .andExpect(jsonPath("$.data.saveStatus").value("saved"));
        }

        mockMvc.perform(post("/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"manual\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/attempts/" + attemptId + "/result")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.attemptId").value(attemptId));
    }

    private String loginAsExamUser() throws Exception {
        return TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
    }
}
