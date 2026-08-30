package com.examsystem.modules.auth;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.JsonHelper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * Resolves a mini-program login {@code code} to an OpenID.
 * Local/CI keeps {@code exam.wechat.mock-openid=true}; production calls jscode2session.
 */
@Component
public class WechatOpenIdResolver {

    private static final Logger log = LoggerFactory.getLogger(WechatOpenIdResolver.class);

    private final boolean mockOpenId;
    private final String appId;
    private final String appSecret;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public WechatOpenIdResolver(
            @Value("${exam.wechat.mock-openid:true}") boolean mockOpenId,
            @Value("${exam.wechat.app-id:}") String appId,
            @Value("${exam.wechat.app-secret:}") String appSecret
    ) {
        this.mockOpenId = mockOpenId;
        this.appId = appId == null ? "" : appId.trim();
        this.appSecret = appSecret == null ? "" : appSecret.trim();
    }

    public String resolve(String code) {
        if (code == null || code.isBlank()) {
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "缺少微信登录 code", 422);
        }
        if (mockOpenId || appId.isBlank() || appSecret.isBlank()) {
            return "mp-" + Integer.toUnsignedString(code.hashCode(), 16);
        }
        try {
            String url = "https://api.weixin.qq.com/sns/jscode2session"
                    + "?appid=" + URLEncoder.encode(appId, StandardCharsets.UTF_8)
                    + "&secret=" + URLEncoder.encode(appSecret, StandardCharsets.UTF_8)
                    + "&js_code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                    + "&grant_type=authorization_code";
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<String, Object> body = JsonHelper.toMap(response.body());
            Object openId = body.get("openid");
            if (openId == null || String.valueOf(openId).isBlank()) {
                log.warn("WeChat jscode2session failed status={} errcode={}", response.statusCode(), body.get("errcode"));
                throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "微信登录失败，请重试", 422);
            }
            return String.valueOf(openId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("WeChat jscode2session error: {}", e.getMessage());
            throw BusinessException.of(ErrorCode.VALIDATION_ERROR, "微信登录失败，请重试", 422);
        }
    }
}
