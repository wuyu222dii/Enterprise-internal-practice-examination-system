package com.examsystem.modules.auth.sms;

import com.examsystem.common.JsonHelper;
import com.examsystem.common.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

final class SmsWebhookClient {

    private static final Logger log = LoggerFactory.getLogger(SmsWebhookClient.class);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private SmsWebhookClient() {
    }

    static boolean send(String webhookUrl, String phone, String purpose, String code) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return false;
        }
        try {
            String json = JsonHelper.toJson(Map.of(
                    "phone", phone,
                    "purpose", purpose,
                    "code", code
            ));
            HttpRequest request = HttpRequest.newBuilder(URI.create(webhookUrl.trim()))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("SMS webhook HTTP {} for phone={}", response.statusCode(), LogSanitizer.maskPhone(phone));
                throw new IllegalStateException("SMS webhook returned HTTP " + response.statusCode());
            }
            return true;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("SMS webhook failed: " + e.getMessage(), e);
        }
    }
}
