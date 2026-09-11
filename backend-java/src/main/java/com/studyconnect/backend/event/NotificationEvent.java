package com.studyconnect.backend.event;

import com.studyconnect.backend.dto.notification.NotificationDto;

public record NotificationEvent(
        EventType type,
        String userId,
        NotificationDto notification
) {
    public enum EventType {
        CREATED,
        UPDATED,
        DELETED
    }
}
