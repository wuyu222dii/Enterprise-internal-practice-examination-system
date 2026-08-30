package com.examsystem.modules.auth.sms;

/**
 * Outbound SMS channel. Verification codes and rate limits stay in {@code SmsVerificationService};
 * this port only delivers a generated code.
 */
public interface SmsGateway {

    void send(String phone, String purpose, String code);
}
