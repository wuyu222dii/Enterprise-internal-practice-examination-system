package com.examsystem.modules.auth.sms;

import com.examsystem.common.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Placeholder for Tencent Cloud SMS. Does not change the OpenAPI SMS send/verify contract.
 */
@Component
@ConditionalOnProperty(name = "exam.sms.provider", havingValue = "tencent")
public class TencentSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(TencentSmsGateway.class);

    @Override
    public void send(String phone, String purpose, String code) {
        log.warn(
                "Tencent SMS adapter is a stub; not sending code for phone={} purpose={}",
                LogSanitizer.maskPhone(phone),
                purpose
        );
        throw new IllegalStateException("Tencent SMS is not configured. Keep exam.sms.provider=mock until vendor credentials are provisioned.");
    }
}
