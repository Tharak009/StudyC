package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.dto.notification.NotificationCreateRequest;
import com.studyconnect.backend.entity.Notification;
import com.studyconnect.backend.entity.enums.EntityType;
import com.studyconnect.backend.entity.enums.NotificationType;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.repository.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notifications;
    @Mock private MongoTemplate mongoTemplate;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @Test
    void createNotificationSavesAndBroadcasts() {
        when(notifications.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId("notification-1");
            notification.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            notification.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            return notification;
        });
        when(notifications.countByUserIdAndIsReadFalse("user-1")).thenReturn(1L);

        NotificationService service = new NotificationService(notifications, mongoTemplate, messagingTemplate);
        var result = service.createNotification(new NotificationCreateRequest(
                "user-1",
                NotificationType.SYSTEM,
                "System alert",
                "Check your dashboard",
                EntityType.COMMUNITY,
                "community-1"
        ));

        assertThat(result.id()).isEqualTo("notification-1");
        verify(messagingTemplate).convertAndSend(eq("/topic/user/user-1/notificationCreated"), any(Object.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/user/user-1/unreadCountUpdate"), any(Object.class));
    }

    @Test
    void markAsReadReturnsNotFoundForMissingNotification() {
        when(notifications.findById("notification-1")).thenReturn(Optional.empty());

        NotificationService service = new NotificationService(notifications, mongoTemplate, messagingTemplate);
        assertThrows(NotFoundException.class, () -> service.markAsRead("notification-1", "user-1"));
    }

    @Test
    void unreadCountUsesRepository() {
        when(notifications.countByUserIdAndIsReadFalse("user-1")).thenReturn(4L);

        NotificationService service = new NotificationService(notifications, mongoTemplate, messagingTemplate);
        assertThat(service.unreadCount("user-1").get("count")).isEqualTo(4L);
    }

    @Test
    void markAllAsReadUpdatesUnreadCount() {
        Notification unread = notification("notification-1", "user-1", false);
        Notification read = notification("notification-2", "user-1", true);
        when(notifications.findAllByUserId("user-1")).thenReturn(List.of(unread, read));
        when(notifications.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationService service = new NotificationService(notifications, mongoTemplate, messagingTemplate);
        var result = service.markAllAsRead("user-1");

        assertThat(result.get("count")).isEqualTo(1L);
    }

    private Notification notification(String id, String userId, boolean isRead) {
        Notification notification = new Notification();
        notification.setId(id);
        notification.setUserId(userId);
        notification.setType(NotificationType.SYSTEM);
        notification.setTitle("Title");
        notification.setMessage("Message");
        notification.setRead(isRead);
        notification.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        notification.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return notification;
    }
}
