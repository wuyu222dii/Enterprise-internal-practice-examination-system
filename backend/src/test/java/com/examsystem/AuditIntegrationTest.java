package com.examsystem;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String adminToken;

    @BeforeEach
    void loginAsAdmin() throws Exception {
        adminToken = TestAuthHelper.loginAdmin(mockMvc, new com.fasterxml.jackson.databind.ObjectMapper());
    }

    @Test
    void createEmployeeWritesAuditLog() throws Exception {
        String employeeNo = "AUDIT" + System.currentTimeMillis() % 100000;
        mockMvc.perform(post("/employees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "%s",
                                  "displayName": "审计测试员工",
                                  "departmentPath": "/总公司"
                                }
                                """.formatted(employeeNo)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/admin/audit-logs?page=1&pageSize=20")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].actionType", hasItem("employee.create")))
                .andExpect(jsonPath("$.data.total").value(greaterThanOrEqualTo(1)));
    }

    @Test
    void auditLogsRequireAdmin() throws Exception {
        mockMvc.perform(get("/admin/audit-logs"))
                .andExpect(status().isUnauthorized());
    }
}
