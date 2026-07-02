package com.studyconnect.backend.dto.notification;

import com.studyconnect.backend.entity.enums.EntityType;
import com.studyconnect.backend.entity.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NotificationCreateRequest(
        @NotBlank(message = "User id is required")
        String userId,

        @NotNull(message = "Notification type is required")
        NotificationType type,

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be at most 200 characters")
        String title,

        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message must be at most 1000 characters")
        String message,

        EntityType entityType,

        String entityId) {
}
