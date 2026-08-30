package com.examsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportExportIntegrationTest {

    private static final String EXAM_ID = "exm_demo";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void exportProducesDualWorksheetWorkbook() throws Exception {
        completeOneAttempt();

        String adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);

        MvcResult createResult = mockMvc.perform(post("/admin/exams/" + EXAM_ID + "/exports")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isAccepted())
                .andReturn();
        String jobId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("jobId").asText();
        assertThat(jobId).isNotBlank();

        String status = awaitTerminalStatus(adminToken, jobId);
        assertThat(status)
                .as("export job %s did not complete", jobId)
                .isEqualTo("completed");

        byte[] content = mockMvc.perform(get("/admin/exports/" + jobId + "/download")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(2);

            Sheet summary = workbook.getSheet("官方成绩汇总");
            assertThat(summary).isNotNull();
            assertThat(summary.getRow(0).getCell(0).getStringCellValue()).isEqualTo("员工姓名");
            // One row per assignee of the published version.
            assertThat(summary.getLastRowNum()).isGreaterThanOrEqualTo(1);

            Sheet attempts = workbook.getSheet("全部尝试明细");
            assertThat(attempts).isNotNull();
            assertThat(attempts.getRow(0).getCell(0).getStringCellValue()).isEqualTo("员工姓名");
            assertThat(attempts.getLastRowNum()).isGreaterThanOrEqualTo(1);

            // One row per attempt. Each employee with a scored attempt must have exactly one row
            // flagged as the official attempt, whichever attempt number that turns out to be.
            Map<String, Integer> officialPerEmployee = new HashMap<>();
            for (int i = 1; i <= attempts.getLastRowNum(); i++) {
                String employeeNo = attempts.getRow(i).getCell(1).getStringCellValue();
                boolean official = "是".equals(attempts.getRow(i).getCell(7).getStringCellValue());
                officialPerEmployee.merge(employeeNo, official ? 1 : 0, Integer::sum);
            }
            assertThat(officialPerEmployee).isNotEmpty();
            assertThat(officialPerEmployee.values()).containsOnly(1);
        }
    }

    private String awaitTerminalStatus(String adminToken, String jobId) throws Exception {
        for (int attempt = 0; attempt < 300; attempt++) {
            MvcResult result = mockMvc.perform(get("/admin/exports/" + jobId)
                            .header("Authorization", "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andReturn();
            String status = objectMapper.readTree(result.getResponse().getContentAsString())
                    .path("data").path("status").asText();
            if ("completed".equals(status) || "failed".equals(status)) {
                return status;
            }
            Thread.sleep(100);
        }
        return "timeout";
    }

    private void completeOneAttempt() throws Exception {
        String token = TestAuthHelper.loginAdminForExamClient(mockMvc, objectMapper);

        MvcResult startResult = mockMvc.perform(post("/exams/" + EXAM_ID + "/attempts")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andReturn();
        String attemptId = objectMapper.readTree(startResult.getResponse().getContentAsString())
                .path("data").path("attemptId").asText();

        MvcResult paperResult = mockMvc.perform(get("/attempts/" + attemptId + "/paper")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode items = objectMapper.readTree(paperResult.getResponse().getContentAsString())
                .path("data").path("items");

        for (JsonNode item : items) {
            mockMvc.perform(put("/attempts/" + attemptId + "/answers/" + item.path("itemId").asText())
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"answer\":[\"B\"],\"answerVersion\":1}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/attempts/" + attemptId + "/submit")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"manual\"}"))
                .andExpect(status().isOk());
    }
}
