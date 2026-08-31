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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PracticeMockIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void practiceSingleActiveSessionWrongBookMoveAndAbandonMutex() throws Exception {
        String token = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);

        MvcResult created = mockMvc.perform(post("/practice/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","mode":"random","questionCount":2}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String sessionId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(post("/practice/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","mode":"random","questionCount":2}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PRA_SESSION_ALREADY_ACTIVE"));

        JsonNode items = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("items");
        String versionId = items.get(0).path("questionVersionId").asText();

        MvcResult wrong = mockMvc.perform(post("/practice/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionVersionId":"%s","answer":["A"]}
                                """.formatted(versionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isCorrect").value(false))
                .andReturn();
        mockMvc.perform(get("/practice/wrong-book?page=1&pageSize=20")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[?(@.questionVersionId == '%s')]".formatted(versionId)).isNotEmpty());

        String correctKey = objectMapper.readTree(wrong.getResponse().getContentAsString())
                .path("data").path("standardAnswer").get(0).asText();
        mockMvc.perform(post("/practice/sessions/" + sessionId + "/answers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionVersionId":"%s","answer":["%s"]}
                                """.formatted(versionId, correctKey)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isCorrect").value(true));
        mockMvc.perform(get("/practice/wrong-book?page=1&pageSize=20")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[?(@.questionVersionId == '%s')]".formatted(versionId)).isEmpty());

        mockMvc.perform(post("/practice/sessions/" + sessionId + "/abandon")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(post("/practice/sessions/" + sessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void mockSingleActiveAndAbandonBlocksTimeoutFinish() throws Exception {
        String token = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);

        MvcResult created = mockMvc.perform(post("/mock/attempts")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","questionCount":2,"durationMinutes":15}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String attemptId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asText();
        if (attemptId.isBlank()) {
            attemptId = objectMapper.readTree(created.getResponse().getContentAsString())
                    .path("data").path("attemptId").asText();
        }

        mockMvc.perform(post("/mock/attempts")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","questionCount":2,"durationMinutes":15}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SIM_ATTEMPT_ALREADY_ACTIVE"));

        mockMvc.perform(post("/mock/attempts/" + attemptId + "/abandon")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(post("/mock/attempts/" + attemptId + "/abandon")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void sequentialPracticeContinuesFromLastQuestionAndRestartRoundResets() throws Exception {
        String token = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        abandonActivePractice(token);

        MvcResult first = mockMvc.perform(post("/practice/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","mode":"sequential","questionCount":2}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode firstItems = objectMapper.readTree(first.getResponse().getContentAsString())
                .path("data").path("items");
        String firstSessionId = objectMapper.readTree(first.getResponse().getContentAsString())
                .path("data").path("id").asText();
        String firstLastVersion = firstItems.get(1).path("questionVersionId").asText();

        mockMvc.perform(post("/practice/sessions/" + firstSessionId + "/finish")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        MvcResult second = mockMvc.perform(post("/practice/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","mode":"sequential","questionCount":2}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode secondItems = objectMapper.readTree(second.getResponse().getContentAsString())
                .path("data").path("items");
        String secondSessionId = objectMapper.readTree(second.getResponse().getContentAsString())
                .path("data").path("id").asText();
        assertThat(secondItems.get(0).path("questionVersionId").asText()).isNotEqualTo(firstItems.get(0).path("questionVersionId").asText());
        assertThat(secondItems.get(0).path("questionVersionId").asText()).isNotEqualTo(firstLastVersion);

        mockMvc.perform(post("/practice/sessions/" + secondSessionId + "/abandon")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        MvcResult restarted = mockMvc.perform(post("/practice/sessions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionBankId":"qb_demo","mode":"sequential","questionCount":2,"restartRound":true}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode restartedItems = objectMapper.readTree(restarted.getResponse().getContentAsString())
                .path("data").path("items");
        assertThat(restartedItems.get(0).path("questionVersionId").asText())
                .isEqualTo(firstItems.get(0).path("questionVersionId").asText());

        mockMvc.perform(post("/practice/sessions/"
                        + objectMapper.readTree(restarted.getResponse().getContentAsString()).path("data").path("id").asText()
                        + "/abandon")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    private void abandonActivePractice(String token) throws Exception {
        MvcResult active = mockMvc.perform(get("/practice/sessions/active")
                        .header("Authorization", "Bearer " + token))
                .andReturn();
        JsonNode data = objectMapper.readTree(active.getResponse().getContentAsString()).path("data");
        if (data.hasNonNull("id") && !data.path("id").asText().isBlank()) {
            mockMvc.perform(post("/practice/sessions/" + data.path("id").asText() + "/abandon")
                            .header("Authorization", "Bearer " + token))
                    .andReturn();
        }
    }
}
