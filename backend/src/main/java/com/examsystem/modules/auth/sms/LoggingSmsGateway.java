package com.examsystem.modules.auth.sms;

import com.examsystem.common.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "exam.sms.provider", havingValue = "mock", matchIfMissing = true)
public class LoggingSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsGateway.class);

    @Override
    public void send(String phone, String purpose, String code) {
        log.info("[SMS Mock] phone={} purpose={} code={}", LogSanitizer.maskPhone(phone), purpose, code);
    }
}
