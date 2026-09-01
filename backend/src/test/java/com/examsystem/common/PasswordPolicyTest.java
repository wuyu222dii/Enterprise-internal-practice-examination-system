package com.examsystem.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    @Test
    void acceptsThreeCharacterClassesWithinLength() {
        PasswordPolicy.validate("Admin@12345", "ADMIN001", null);
    }

    @Test
    void rejectsShortOrSingleClassPasswords() {
        assertThatThrownBy(() -> PasswordPolicy.validate("password", "EMP001", null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", ErrorCode.AUTH_PASSWORD_POLICY_VIOLATION);
        assertThatThrownBy(() -> PasswordPolicy.validate("Abcdefgh", "EMP001", null))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsEmployeeNoAndPhone() {
        assertThatThrownBy(() -> PasswordPolicy.validate("ADMIN001@a", "ADMIN001", null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("工号");
        assertThatThrownBy(() -> PasswordPolicy.validate("Phone13800009999!", "EMP001", "13800009999"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("手机号");
    }

    @Test
    void generatedTemporaryPasswordSatisfiesPolicy() {
        for (int i = 0; i < 20; i++) {
            String password = PasswordPolicy.generateTemporary();
            assertThat(password).hasSize(12);
            PasswordPolicy.validate(password, null, null);
        }
    }
}
