package com.examsystem.modules.auth.sms;

import com.examsystem.common.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Placeholder for the Aliyun Dysms API. Wire access key / sign name via environment variables
 * before switching {@code exam.sms.provider=aliyun}; the OpenAPI contract is unchanged.
 */
@Component
@ConditionalOnProperty(name = "exam.sms.provider", havingValue = "aliyun")
public class AliyunSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(AliyunSmsGateway.class);

    @Override
    public void send(String phone, String purpose, String code) {
        log.warn(
                "Aliyun SMS adapter is a stub; not sending code for phone={} purpose={}",
                LogSanitizer.maskPhone(phone),
                purpose
        );
        throw new IllegalStateException("Aliyun SMS is not configured. Keep exam.sms.provider=mock until vendor credentials are provisioned.");
    }
}
