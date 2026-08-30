package com.examsystem;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void ensureAdminPasswordChanged() throws Exception {
        TestAuthHelper.loginAdmin(mockMvc, objectMapper);
    }

    @Test
    void loginWithValidCredentialsReturnsSession() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "ADMIN001",
                                  "password": "Admin@12345",
                                  "clientType": "adminWeb"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.session.employeeNo").value("ADMIN001"))
                .andExpect(jsonPath("$.data.session.isAdmin").value(true))
                .andExpect(jsonPath("$.data.session.mustChangePassword").value(false))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.meta.requestId").isNotEmpty());
    }

    @Test
    void loginWithInvalidCredentialsReturns401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "ADMIN001",
                                  "password": "wrong-password",
                                  "clientType": "adminWeb"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("AUTH_INVALID_CREDENTIALS"));
    }

    @Test
    void changePasswordClearsMustChangeFlag() throws Exception {
        String token = TestAuthHelper.loginAdmin(mockMvc, objectMapper);

        mockMvc.perform(get("/auth/session")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.session.mustChangePassword").value(false));
    }

    @Test
    void protectedEndpointWithoutTokenReturns401() throws Exception {
        mockMvc.perform(get("/departments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void smsPasswordResetFlow() throws Exception {
        mockMvc.perform(post("/auth/sms/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"13800009999","purpose":"resetPassword"}
                                """))
                .andExpect(status().isOk());

        var verifyResult = mockMvc.perform(post("/auth/sms/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"13800009999","code":"123456","purpose":"resetPassword"}
                                """))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(verifyResult.getResponse().getContentAsString())
                .path("data").path("verificationToken").asText();

        mockMvc.perform(post("/auth/password-reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "ADMIN001",
                                  "verificationToken": "%s",
                                  "newPassword": "Admin@12345"
                                }
                                """.formatted(token)))
                .andExpect(status().isUnauthorized());
    }
}
