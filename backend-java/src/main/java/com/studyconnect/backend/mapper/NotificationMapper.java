package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.notification.NotificationDto;
import com.studyconnect.backend.entity.Notification;

public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationDto toDto(Notification notification) {
        return new NotificationDto(
                notification.getId(),
                notification.getUserId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getEntityType(),
                notification.getEntityId(),
                notification.isRead(),
                notification.getReadAt(),
                notification.getCreatedAt(),
                notification.getUpdatedAt()
        );
    }
}
