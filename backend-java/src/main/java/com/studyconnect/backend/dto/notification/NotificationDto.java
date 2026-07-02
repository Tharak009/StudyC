package com.studyconnect.backend.dto.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.EntityType;
import com.studyconnect.backend.entity.enums.NotificationType;
import java.time.Instant;

public record NotificationDto(
        @JsonProperty("_id") String id,
        String userId,
        NotificationType type,
        String title,
        String message,
        EntityType entityType,
        String entityId,
        boolean isRead,
        Instant readAt,
        Instant createdAt,
        Instant updatedAt) {
}
