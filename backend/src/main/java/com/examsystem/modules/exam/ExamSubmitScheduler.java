package com.examsystem.modules.exam;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ExamSubmitScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExamSubmitScheduler.class);

    private final ExamService examService;

    public ExamSubmitScheduler(ExamService examService) {
        this.examService = examService;
    }

    @Scheduled(fixedDelayString = "${exam.scheduler.auto-submit-ms:60000}")
    public void autoSubmitExpiredAttempts() {
        try {
            examService.advanceExamLifecycles();
        } catch (Exception e) {
            log.warn("Advance exam lifecycle failed", e);
        }

        List<String> attemptIds = examService.findExpiredAttemptIds();
        if (attemptIds.isEmpty()) {
            return;
        }

        int submitted = 0;
        for (String attemptId : attemptIds) {
            try {
                // Each attempt commits on its own so a single failure cannot take down the batch
                // when hundreds of attempts expire in the same second (PERF-03).
                examService.autoSubmitAttempt(attemptId);
                submitted++;
            } catch (Exception e) {
                log.warn("Auto submit failed for exam attempt {}", attemptId, e);
            }
        }
        log.info("Auto submitted {} of {} expired exam attempts", submitted, attemptIds.size());
    }
}
