package com.examsystem.modules.retention;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "exam.retention.enabled", havingValue = "true", matchIfMissing = true)
public class RetentionScheduler {

    private final RetentionService retentionService;

    public RetentionScheduler(RetentionService retentionService) {
        this.retentionService = retentionService;
    }

    @Scheduled(fixedDelayString = "${exam.retention.interval-ms:3600000}")
    public void run() {
        retentionService.purgeExpired();
    }
}
