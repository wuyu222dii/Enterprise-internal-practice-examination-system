package com.examsystem.common;

import org.springframework.stereotype.Component;

@Component
public class MetaFactory {

    public ResponseMeta build() {
        String requestId = RequestContext.getRequestId();
        if (requestId == null || requestId.isBlank()) {
            requestId = IdGenerator.requestId();
        }
        return new ResponseMeta(IdGenerator.now(), requestId);
    }
}
