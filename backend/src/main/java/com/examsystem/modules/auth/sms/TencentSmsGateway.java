package com.examsystem.modules.auth.sms;

import com.examsystem.common.JsonHelper;
import com.examsystem.common.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "exam.sms.provider", havingValue = "tencent")
public class TencentSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(TencentSmsGateway.class);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);

    private final String webhookUrl;
    private final String secretId;
    private final String secretKey;
    private final String sdkAppId;
    private final String signName;
    private final String templateId;

    public TencentSmsGateway(
            @Value("${exam.sms.webhook-url:}") String webhookUrl,
            @Value("${exam.sms.tencent.secret-id:}") String secretId,
            @Value("${exam.sms.tencent.secret-key:}") String secretKey,
            @Value("${exam.sms.tencent.sdk-app-id:}") String sdkAppId,
            @Value("${exam.sms.tencent.sign-name:}") String signName,
            @Value("${exam.sms.tencent.template-id:}") String templateId
    ) {
        this.webhookUrl = webhookUrl;
        this.secretId = secretId;
        this.secretKey = secretKey;
        this.sdkAppId = sdkAppId;
        this.signName = signName;
        this.templateId = templateId;
    }

    @Override
    public void send(String phone, String purpose, String code) {
        if (SmsWebhookClient.send(webhookUrl, phone, purpose, code)) {
            return;
        }
        if (isBlank(secretId) || isBlank(secretKey) || isBlank(sdkAppId) || isBlank(signName) || isBlank(templateId)) {
            throw new IllegalStateException(
                    "Tencent SMS is not configured. Set exam.sms.tencent.* or EXAM_SMS_WEBHOOK_URL.");
        }
        try {
            String payload = JsonHelper.toJson(Map.of(
                    "PhoneNumberSet", List.of(phone),
                    "SmsSdkAppId", sdkAppId,
                    "SignName", signName,
                    "TemplateId", templateId,
                    "TemplateParamSet", List.of(code)
            ));
            long timestamp = Instant.now().getEpochSecond();
            String date = DATE.format(Instant.ofEpochSecond(timestamp));
            String canonicalHeaders = "content-type:application/json; charset=utf-8\nhost:sms.tencentcloudapi.com\n";
            String signedHeaders = "content-type;host";
            String hashedPayload = sha256Hex(payload);
            String canonicalRequest = "POST\n/\n\n" + canonicalHeaders + "\n" + signedHeaders + "\n" + hashedPayload;
            String credentialScope = date + "/sms/tc3_request";
            String stringToSign = "TC3-HMAC-SHA256\n" + timestamp + "\n" + credentialScope + "\n" + sha256Hex(canonicalRequest);
            byte[] secretDate = hmac(("TC3" + secretKey).getBytes(StandardCharsets.UTF_8), date);
            byte[] secretService = hmac(secretDate, "sms");
            byte[] secretSigning = hmac(secretService, "tc3_request");
            String signature = HexFormat.of().formatHex(hmac(secretSigning, stringToSign));
            String authorization = "TC3-HMAC-SHA256 Credential=" + secretId + "/" + credentialScope
                    + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;

            HttpRequest request = HttpRequest.newBuilder(URI.create("https://sms.tencentcloudapi.com"))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("Host", "sms.tencentcloudapi.com")
                    .header("X-TC-Action", "SendSms")
                    .header("X-TC-Version", "2021-01-11")
                    .header("X-TC-Timestamp", String.valueOf(timestamp))
                    .header("Authorization", authorization)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Tencent SMS HTTP {} phone={}", response.statusCode(), LogSanitizer.maskPhone(phone));
                throw new IllegalStateException("Tencent SMS rejected the request");
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Tencent SMS send failed: " + e.getMessage(), e);
        }
    }

    private static byte[] hmac(byte[] key, String message) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256Hex(String value) throws Exception {
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
