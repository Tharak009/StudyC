package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success(
                Map.of(
                        "status", "ok",
                        "timestamp", Instant.now().toString()
                ),
                "StudyConnect API is healthy"
        );
    }

    @GetMapping("/api/future-modules")
    public ApiResponse<Map<String, Object>> futureModules() {
        return ApiResponse.success(
                Map.of(
                        "communities", "active",
                        "chat", "active",
                        "directMessaging", "active",
                        "resources", "active",
                        "notifications", "active",
                        "admin", "active",
                        "calls", "planned"
                ),
                "Future module contract"
        );
    }
}
