package com.studyconnect.backend.dto.notification;

import java.util.List;

public record PaginatedNotificationsDto(
        List<NotificationDto> items,
        long total,
        int page,
        int limit,
        int pages) {
}
