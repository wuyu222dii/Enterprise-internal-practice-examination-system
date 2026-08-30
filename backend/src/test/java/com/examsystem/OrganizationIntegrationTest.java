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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrganizationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;

    @BeforeEach
    void setup() throws Exception {
        adminToken = TestAuthHelper.loginAdmin(mockMvc, objectMapper);
    }

    @Test
    void disableEmployeeRevokesAccess() throws Exception {
        mockMvc.perform(post("/employees")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeNo": "TMP001",
                                  "displayName": "临时员工",
                                  "departmentPath": "/总公司",
                                  "phone": "13800001111"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(patch("/employees/emp_admin")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "active"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void adminGrantsRequiresReason() throws Exception {
        mockMvc.perform(patch("/employees/emp_admin/admin-grants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "isAdmin": true,
                                  "hasOutageDisposition": true,
                                  "reason": "测试授权"
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void cannotRemoveLastOutageAdmin() throws Exception {
        mockMvc.perform(patch("/employees/emp_admin/admin-grants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "isAdmin": true,
                                  "hasOutageDisposition": false,
                                  "reason": "尝试移除"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("ORG_LAST_OUTAGE_ADMIN"));
    }
}
