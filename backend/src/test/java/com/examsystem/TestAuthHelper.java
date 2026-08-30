package com.examsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

final class TestAuthHelper {

    private TestAuthHelper() {
    }

    static String loginAdmin(MockMvc mockMvc, ObjectMapper objectMapper) throws Exception {
        MvcResult loginResult = tryLogin(mockMvc, "Admin@123", "adminWeb");
        String currentPassword = "Admin@123";
        if (loginResult.getResponse().getStatus() != 200) {
            loginResult = tryLogin(mockMvc, "Admin@12345", "adminWeb");
            currentPassword = "Admin@12345";
        }
        if (loginResult.getResponse().getStatus() != 200) {
            throw new IllegalStateException("Admin login failed: " + loginResult.getResponse().getContentAsString());
        }

        JsonNode root = objectMapper.readTree(loginResult.getResponse().getContentAsString());
        String token = root.path("data").path("token").asText();
        if (root.path("data").path("session").path("mustChangePassword").asBoolean(false)) {
            mockMvc.perform(post("/auth/change-password")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "currentPassword": "%s",
                                      "newPassword": "Admin@12345"
                                    }
                                    """.formatted(currentPassword)))
                    .andExpect(status().isOk());
        }
        return token;
    }

    static String loginAdminForExamClient(MockMvc mockMvc, ObjectMapper objectMapper) throws Exception {
        loginAdmin(mockMvc, objectMapper);
        MvcResult loginResult = tryLogin(mockMvc, "Admin@12345", "examWeb");
        if (loginResult.getResponse().getStatus() != 200) {
            throw new IllegalStateException("Exam client login failed: " + loginResult.getResponse().getContentAsString());
        }
        return objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    static String loginExam001(MockMvc mockMvc, ObjectMapper objectMapper) throws Exception {
        MvcResult loginResult = tryLoginExam001(mockMvc, "Admin@123");
        if (loginResult.getResponse().getStatus() != 200) {
            loginResult = tryLoginExam001(mockMvc, "Admin@12345");
        }
        if (loginResult.getResponse().getStatus() != 200) {
            throw new IllegalStateException("EXAM001 login failed: " + loginResult.getResponse().getContentAsString());
        }
        return objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    private static MvcResult tryLoginExam001(MockMvc mockMvc, String password) throws Exception {
        return mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "EXAM001",
                                  "password": "%s",
                                  "clientType": "examWeb"
                                }
                                """.formatted(password)))
                .andReturn();
    }

    private static MvcResult tryLogin(MockMvc mockMvc, String password, String clientType) throws Exception {
        return mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "ADMIN001",
                                  "password": "%s",
                                  "clientType": "%s"
                                }
                                """.formatted(password, clientType)))
                .andReturn();
    }
}
