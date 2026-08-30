package com.examsystem.modules.mock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MockSubmitScheduler {

    private static final Logger log = LoggerFactory.getLogger(MockSubmitScheduler.class);

    private final MockService mockService;

    public MockSubmitScheduler(MockService mockService) {
        this.mockService = mockService;
    }

    @Scheduled(fixedDelayString = "${exam.scheduler.auto-submit-ms:60000}")
    public void autoSubmitExpiredAttempts() {
        log.debug("Scanning expired mock attempts for auto submit");
        mockService.autoSubmitExpiredAttempts();
    }
}
