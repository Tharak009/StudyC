package com.studyconnect.backend.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "studyconnect")
public record StudyConnectProperties(
        String clientUrl,
        List<String> approvedEmailDomains,
        Jwt jwt,
        int bcryptRounds,
        String uploadDir,
        boolean cookieSecure) {

    public record Jwt(String accessSecret, String refreshSecret, Duration accessTtl, long refreshTtlDays) {
    }
}
