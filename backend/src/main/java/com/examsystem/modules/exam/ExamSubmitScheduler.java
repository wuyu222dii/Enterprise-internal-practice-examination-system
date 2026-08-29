package com.examsystem.modules.exam;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ExamSubmitScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExamSubmitScheduler.class);

    private final ExamService examService;

    public ExamSubmitScheduler(ExamService examService) {
        this.examService = examService;
    }

    @Scheduled(fixedDelayString = "${exam.scheduler.auto-submit-ms:60000}")
    public void autoSubmitExpiredAttempts() {
        log.debug("Scanning expired exam attempts for auto submit");
        examService.autoSubmitExpiredAttempts();
    }
}
