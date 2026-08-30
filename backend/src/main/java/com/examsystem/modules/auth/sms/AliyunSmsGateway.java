package com.examsystem.modules.auth.sms;

import com.examsystem.common.LogSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.TreeMap;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "exam.sms.provider", havingValue = "aliyun")
public class AliyunSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(AliyunSmsGateway.class);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final String webhookUrl;
    private final String accessKeyId;
    private final String accessKeySecret;
    private final String signName;
    private final String templateCode;

    public AliyunSmsGateway(
            @Value("${exam.sms.webhook-url:}") String webhookUrl,
            @Value("${exam.sms.aliyun.access-key-id:}") String accessKeyId,
            @Value("${exam.sms.aliyun.access-key-secret:}") String accessKeySecret,
            @Value("${exam.sms.aliyun.sign-name:}") String signName,
            @Value("${exam.sms.aliyun.template-code:}") String templateCode
    ) {
        this.webhookUrl = webhookUrl;
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
        this.signName = signName;
        this.templateCode = templateCode;
    }

    @Override
    public void send(String phone, String purpose, String code) {
        if (SmsWebhookClient.send(webhookUrl, phone, purpose, code)) {
            return;
        }
        if (isBlank(accessKeyId) || isBlank(accessKeySecret) || isBlank(signName) || isBlank(templateCode)) {
            throw new IllegalStateException(
                    "Aliyun SMS is not configured. Set exam.sms.aliyun.* or EXAM_SMS_WEBHOOK_URL.");
        }
        try {
            Map<String, String> params = new TreeMap<>();
            params.put("AccessKeyId", accessKeyId);
            params.put("Action", "SendSms");
            params.put("Format", "JSON");
            params.put("PhoneNumbers", phone);
            params.put("RegionId", "cn-hangzhou");
            params.put("SignName", signName);
            params.put("SignatureMethod", "HMAC-SHA1");
            params.put("SignatureNonce", UUID.randomUUID().toString());
            params.put("SignatureVersion", "1.0");
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
            iso.setTimeZone(TimeZone.getTimeZone("UTC"));
            params.put("Timestamp", iso.format(new Date()));
            params.put("TemplateCode", templateCode);
            params.put("TemplateParam", "{\"code\":\"" + code + "\"}");
            params.put("Version", "2017-05-25");

            String canonical = canonicalQuery(params);
            String stringToSign = "GET&%2F&" + percentEncode(canonical);
            String signature = sign(stringToSign, accessKeySecret + "&");
            String url = "https://dysmsapi.aliyuncs.com/?Signature=" + percentEncode(signature) + "&" + canonical;
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300 || (response.body() != null && response.body().contains("\"Code\"")
                    && !response.body().contains("\"OK\""))) {
                log.warn("Aliyun SMS failed status={} bodyLength={} phone={}",
                        response.statusCode(),
                        response.body() == null ? 0 : response.body().length(),
                        LogSanitizer.maskPhone(phone));
                throw new IllegalStateException("Aliyun SMS rejected the request");
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Aliyun SMS send failed: " + e.getMessage(), e);
        }
    }

    private static String canonicalQuery(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(percentEncode(entry.getKey())).append('=').append(percentEncode(entry.getValue()));
        }
        return sb.toString();
    }

    private static String sign(String stringToSign, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
        return Base64.getEncoder().encodeToString(mac.doFinal(stringToSign.getBytes(StandardCharsets.UTF_8)));
    }

    private static String percentEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20")
                .replace("*", "%2A")
                .replace("%7E", "~");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
