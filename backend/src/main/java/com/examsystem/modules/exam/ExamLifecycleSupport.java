package com.examsystem.modules.exam;

import com.examsystem.common.JsonHelper;
import com.examsystem.modules.exam.entity.Exam;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.outage.repository.OutageEventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
public class ExamLifecycleSupport {

    public static final String BLOCK_PAUSED = "paused";
    public static final String BLOCK_PENDING_OUTAGE = "pendingOutage";
    public static final String BLOCK_IN_PROGRESS = "inProgressAttempts";
    public static final String BLOCK_OBSERVATION = "observation";

    private final ExamAttemptRepository attemptRepository;
    private final OutageEventRepository outageEventRepository;
    private final int windowSeconds;

    public ExamLifecycleSupport(
            ExamAttemptRepository attemptRepository,
            OutageEventRepository outageEventRepository,
            @Value("${exam.observation.window-seconds:20}") int windowSeconds
    ) {
        this.attemptRepository = attemptRepository;
        this.outageEventRepository = outageEventRepository;
        this.windowSeconds = windowSeconds;
    }

    public int windowSeconds() {
        return windowSeconds;
    }

    public Instant attemptObservationEndsAt(Instant expiresAt) {
        return expiresAt.plusSeconds(windowSeconds);
    }

    public Instant wrappingEndsAt(Instant stopAttemptAt) {
        return stopAttemptAt.plusSeconds(windowSeconds);
    }

    public boolean isAttemptExpired(ExamAttempt attempt, Instant now) {
        return attempt.getExpiresAt() != null && !now.isBefore(attempt.getExpiresAt());
    }

    public boolean isAttemptInObservation(ExamAttempt attempt, Instant now) {
        if (attempt.getExpiresAt() == null) {
            return false;
        }
        return !now.isBefore(attempt.getExpiresAt())
                && now.isBefore(attemptObservationEndsAt(attempt.getExpiresAt()));
    }

    public boolean isAttemptPastObservation(ExamAttempt attempt, Instant now) {
        return attempt.getExpiresAt() != null
                && !now.isBefore(attemptObservationEndsAt(attempt.getExpiresAt()));
    }

    public long remainingSeconds(Instant expiresAt, Instant now) {
        if (expiresAt == null) {
            return 0;
        }
        return Math.max(0, Duration.between(now, expiresAt).getSeconds());
    }

    public long observationRemainingSeconds(Instant expiresAt, Instant now) {
        if (expiresAt == null) {
            return 0;
        }
        return Math.max(0, Duration.between(now, attemptObservationEndsAt(expiresAt)).getSeconds());
    }

    public String resolveLifecycle(Exam exam) {
        return resolveLifecycle(exam, Instant.now());
    }

    public String resolveLifecycle(Exam exam, Instant now) {
        String stored = exam.getLifecycle();
        if ("draft".equals(stored) || "cancelled".equals(stored)) {
            return stored;
        }
        if ("ended".equals(stored)) {
            if (exam.getStopAttemptAt() != null && now.isBefore(exam.getStopAttemptAt())) {
                if (exam.getOpenStartAt() != null && now.isBefore(exam.getOpenStartAt())) {
                    return "notStarted";
                }
                return "openForAttempt";
            }
            return "ended";
        }
        if (exam.getOpenStartAt() != null && now.isBefore(exam.getOpenStartAt())) {
            return "notStarted";
        }
        if (exam.getStopAttemptAt() != null && !now.isBefore(exam.getStopAttemptAt())) {
            return wrappingBlockReason(exam, now) == null ? "ended" : "closing";
        }
        return "openForAttempt";
    }

    public String wrappingBlockReason(Exam exam, Instant now) {
        if (exam.getStopAttemptAt() == null || now.isBefore(exam.getStopAttemptAt())) {
            return null;
        }
        if ("paused".equals(exam.getRunStatus())) {
            return BLOCK_PAUSED;
        }
        if (hasPendingOutage(exam.getId())) {
            return BLOCK_PENDING_OUTAGE;
        }
        long inFlight = attemptRepository.countByExamIdAndAttemptStatus(exam.getId(), "inProgress")
                + attemptRepository.countByExamIdAndAttemptStatus(exam.getId(), "submitting");
        if (inFlight > 0) {
            return BLOCK_IN_PROGRESS;
        }
        if (now.isBefore(wrappingEndsAt(exam.getStopAttemptAt()))) {
            return BLOCK_OBSERVATION;
        }
        return null;
    }

    public long closingRemainingSeconds(Exam exam, Instant now) {
        if (exam.getStopAttemptAt() == null) {
            return 0;
        }
        return Math.max(0, Duration.between(now, wrappingEndsAt(exam.getStopAttemptAt())).getSeconds());
    }

    public boolean hasPendingOutage(String examId) {
        return outageEventRepository.findByStatus("detected").stream()
                .anyMatch(event -> JsonHelper.toStringList(event.getAffectedExamIds()).contains(examId));
    }

    public boolean shouldLockForLateOutage(ExamAttempt attempt) {
        if (!"timeout".equals(attempt.getSubmitReason())
                || attempt.getSubmittedAt() == null
                || attempt.getExpiresAt() == null) {
            return false;
        }
        return !attempt.getSubmittedAt().isBefore(attemptObservationEndsAt(attempt.getExpiresAt()));
    }

    public String resultState(Exam exam, Instant now) {
        if (exam.isResultLocked()) {
            return "locked";
        }
        String lifecycle = resolveLifecycle(exam, now);
        if ("cancelled".equals(lifecycle)) {
            return "cancelled";
        }
        if ("closing".equals(lifecycle)) {
            return "closing";
        }
        return "available";
    }
}
