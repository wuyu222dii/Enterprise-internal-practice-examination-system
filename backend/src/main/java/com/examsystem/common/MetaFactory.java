package com.examsystem.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MetaFactory {

    private final String timezone;

    public MetaFactory(@Value("${exam.display.timezone:Asia/Shanghai}") String timezone) {
        this.timezone = timezone;
    }

    public ResponseMeta build() {
        String requestId = RequestContext.getRequestId();
        if (requestId == null || requestId.isBlank()) {
            requestId = IdGenerator.requestId();
        }
        return new ResponseMeta(IdGenerator.now(), requestId, timezone);
    }
}
