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

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExamLocateIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void assignedEmployeeCanLocateByExamCodeAndUnassignedGetsSameNotFound() throws Exception {
        String exam001 = TestAuthHelper.loginExam001(mockMvc, objectMapper);

        mockMvc.perform(get("/exams/locate").param("examCode", "EX-DEMO1")
                        .header("Authorization", "Bearer " + exam001))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("exm_demo"))
                .andExpect(jsonPath("$.data.examCode").value("EX-DEMO1"))
                .andExpect(jsonPath("$.data.portalUrl").value("http://localhost:5174/exams/exm_demo"))
                .andExpect(jsonPath("$.data.durationMinutes").value(60))
                .andExpect(jsonPath("$.data.maxAttempts").value(3))
                .andExpect(jsonPath("$.meta.timezone").value("Asia/Shanghai"));

        mockMvc.perform(get("/exams/exm_demo")
                        .header("Authorization", "Bearer " + exam001))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.examCode").value("EX-DEMO1"));

        mockMvc.perform(get("/exams/locate").param("examCode", "EX-NOPE0")
                        .header("Authorization", "Bearer " + exam001))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message").value("未找到可参加的考试"));

        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "定位资格考试");
        MvcResult adminExam = mockMvc.perform(get("/admin/exams/" + examId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.examCode", startsWith("EX-")))
                .andReturn();
        String examCode = objectMapper.readTree(adminExam.getResponse().getContentAsString())
                .path("data").path("examCode").asText();
        assertThat(examCode).isNotEqualTo("exm_demo");

        mockMvc.perform(get("/exams/" + examId)
                        .header("Authorization", "Bearer " + exam001))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message").value("未找到可参加的考试"));

        mockMvc.perform(get("/exams/locate").param("examCode", examCode)
                        .header("Authorization", "Bearer " + exam001))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message").value("未找到可参加的考试"));

        String examToken = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);
        mockMvc.perform(get("/exams/locate").param("examCode", examCode)
                        .header("Authorization", "Bearer " + examToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(examId));
    }

    @Test
    void copyQuestionCreatesIndependentActiveQuestionWithoutDisablingSource() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        MvcResult copied = mockMvc.perform(post("/questions/q_demo_01/copy")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"targetBankId":"qb_demo","categoryId":"cat_demo"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.status").value("active"))
                .andReturn();
        String copyId = objectMapper.readTree(copied.getResponse().getContentAsString())
                .path("data").path("id").asText();
        assertThat(copyId).isNotEqualTo("q_demo_01");

        mockMvc.perform(get("/questions/q_demo_01")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("active"));
    }

    @Test
    void auditIntegrityIsValidAfterAdminActionAndRepairIsDenied() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "审计链考试");

        mockMvc.perform(get("/admin/audit-logs/integrity")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.repairAllowed").value(false));
    }

    @Test
    void publishedExamAllowsDescriptionRevisionOnly() throws Exception {
        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
        String examId = TestExamHelper.createAndPublishExam(mockMvc, objectMapper, adminToken, "说明修订考试");

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/admin/exams/" + examId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"不得改标题"}
                                """))
                .andExpect(status().isUnprocessableEntity());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/admin/exams/" + examId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"发布后说明修订"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/admin/exams/" + examId + "/description-revisions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].body").value("发布后说明修订"));
    }
}
