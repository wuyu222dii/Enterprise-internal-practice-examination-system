package com.examsystem.modules.mock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MockSubmitScheduler {

    private static final Logger log = LoggerFactory.getLogger(MockSubmitScheduler.class);

    private final MockService mockService;

    public MockSubmitScheduler(MockService mockService) {
        this.mockService = mockService;
    }

    @Scheduled(fixedDelayString = "${exam.scheduler.auto-submit-ms:60000}")
    public void autoSubmitExpiredAttempts() {
        List<String> attemptIds = mockService.findExpiredAttemptIds();
        if (attemptIds.isEmpty()) {
            return;
        }

        int submitted = 0;
        for (String attemptId : attemptIds) {
            try {
                mockService.autoSubmitAttempt(attemptId);
                submitted++;
            } catch (Exception e) {
                log.warn("Auto submit failed for mock attempt {}", attemptId, e);
            }
        }
        log.info("Auto submitted {} of {} expired mock attempts", submitted, attemptIds.size());
    }
}
