package com.examsystem.modules.outage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Component
@ConditionalOnProperty(name = "exam.outage.probe-enabled", havingValue = "true")
public class OutageHealthProbe {

    private static final Logger log = LoggerFactory.getLogger(OutageHealthProbe.class);

    private final DataSource dataSource;
    private final OutageService outageService;
    private final long observationWindowMs;
    private final AtomicReference<Instant> failingSince = new AtomicReference<>();

    public OutageHealthProbe(
            DataSource dataSource,
            OutageService outageService,
            @Value("${exam.outage.observation-window-ms:15000}") long observationWindowMs
    ) {
        this.dataSource = dataSource;
        this.outageService = outageService;
        this.observationWindowMs = observationWindowMs;
    }

    @Scheduled(fixedDelayString = "${exam.outage.probe-interval-ms:5000}")
    public void probe() {
        if (healthy()) {
            failingSince.set(null);
            return;
        }
        Instant started = failingSince.updateAndGet(current -> current == null ? Instant.now() : current);
        if (Duration.between(started, Instant.now()).toMillis() < observationWindowMs) {
            log.warn("Health probe failing; waiting for observation window {}ms", observationWindowMs);
            return;
        }
        log.error("Health probe failed beyond observation window; pausing open exams");
        outageService.detectAndPause(List.of(), "health probe failed beyond observation window", false);
        failingSince.set(Instant.now());
    }

    private boolean healthy() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2);
        } catch (Exception e) {
            log.warn("Health probe database check failed", e);
            return false;
        }
    }
}
