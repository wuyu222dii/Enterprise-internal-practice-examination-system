package com.examsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

final class TestExamHelper {

    private TestExamHelper() {
    }

    static String createAndPublishExam(MockMvc mockMvc, ObjectMapper objectMapper, String adminToken, String title)
            throws Exception {
        return createAndPublishExam(mockMvc, objectMapper, adminToken, title, List.of(
                ruleLine("qb_demo", "singleChoice", 2)
        ), 3, null);
    }

    static String createAndPublishExam(
            MockMvc mockMvc,
            ObjectMapper objectMapper,
            String adminToken,
            String title,
            List<String> ruleLinesJson,
            int maxAttempts,
            String resultPolicyJson
    ) throws Exception {
        MvcResult create = mockMvc.perform(post("/admin/exams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        String examId = objectMapper.readTree(create.getResponse().getContentAsString())
                .path("data").path("id").asText();

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/basic")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "openStartAt": "%s"
                                }
                                """.formatted(title, Instant.now().minusSeconds(60).toString())))
                .andExpect(status().isOk());

        String rules = """
                {
                  "durationMinutes": 60,
                  "maxAttempts": %d,
                  "passingScore": 0,
                  "ruleLines": [%s]
                }
                """.formatted(maxAttempts, String.join(",", ruleLinesJson));
        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/rules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rules))
                .andExpect(status().isOk());

        mockMvc.perform(put("/admin/exams/" + examId + "/wizard/assignees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "mode": "selected",
                                  "employeeIds": ["emp_admin"]
                                }
                                """))
                .andExpect(status().isOk());

        if (resultPolicyJson != null) {
            mockMvc.perform(put("/admin/exams/" + examId + "/wizard/visibility")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(resultPolicyJson))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/admin/exams/" + examId + "/preflight")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/admin/exams/" + examId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        return examId;
    }

    static String ruleLine(String bankId, String type, int drawCount) {
        return """
                {"bankId":"%s","type":"%s","drawCount":%d,"scorePerQuestion":1}
                """.formatted(bankId, type, drawCount).trim();
    }

    static String startAttempt(MockMvc mockMvc, ObjectMapper objectMapper, String token, String examId)
            throws Exception {
        MvcResult result = mockMvc.perform(post("/exams/" + examId + "/attempts")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", UUID.randomUUID().toString()))
                .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        if (result.getResponse().getStatus() == 409 && data.has("attemptId")) {
            return data.path("attemptId").asText();
        }
        if (result.getResponse().getStatus() != 200) {
            throw new IllegalStateException("start attempt failed: " + result.getResponse().getContentAsString());
        }
        return data.path("attemptId").asText();
    }

    static MockMultipartFile questionWorkbook(List<String[]> rows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("questions");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("type");
            header.createCell(1).setCellValue("stem");
            header.createCell(2).setCellValue("options");
            header.createCell(3).setCellValue("standardAnswer");
            header.createCell(4).setCellValue("difficulty");
            int i = 1;
            for (String[] row : rows) {
                Row excelRow = sheet.createRow(i++);
                for (int c = 0; c < row.length; c++) {
                    excelRow.createCell(c).setCellValue(row[c]);
                }
            }
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "questions.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray()
            );
        }
    }
}
