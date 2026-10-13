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
        boolean cookieSecure,
        String storageMode,
        S3 s3) {

    public record Jwt(String accessSecret, String refreshSecret, Duration accessTtl, long refreshTtlDays) {
    }

    public record S3(String bucket, String region, String endpoint, String accessKey, String secretKey) {
        public boolean isConfigured() {
            return bucket != null && !bucket.isBlank() && accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank();
        }
    }
}
