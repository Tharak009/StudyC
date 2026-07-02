package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyconnect.backend.dto.notification.NotificationDto;
import com.studyconnect.backend.dto.notification.PaginatedNotificationsDto;
import com.studyconnect.backend.entity.enums.EntityType;
import com.studyconnect.backend.entity.enums.NotificationType;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.NotificationService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc
class NotificationControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private NotificationService notificationService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(username = "user-1")
    void listReturnsPaginatedNotifications() throws Exception {
        when(notificationService.listNotifications(eq("user-1"), eq(1), eq(20), eq(false)))
                .thenReturn(new PaginatedNotificationsDto(List.of(sampleNotification()), 1, 1, 20, 1));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Notifications retrieved"))
                .andExpect(jsonPath("$.data.items[0]._id").value("notification-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void unreadCountReturnsCount() throws Exception {
        when(notificationService.unreadCount("user-1")).thenReturn(Map.of("count", 5L));

        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(5));
    }

    @Test
    @WithMockUser(username = "user-1")
    void markAsReadReturnsNotification() throws Exception {
        when(notificationService.markAsRead("notification-1", "user-1")).thenReturn(sampleNotification());

        mockMvc.perform(patch("/api/notifications/notification-1/read").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Notification marked as read"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void markAllAsReadReturnsCount() throws Exception {
        when(notificationService.markAllAsRead("user-1")).thenReturn(Map.of("count", 2L));

        mockMvc.perform(patch("/api/notifications/read-all").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("All notifications marked as read"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void deleteReturnsSuccess() throws Exception {
        when(notificationService.deleteNotification("notification-1", "user-1")).thenReturn(sampleNotification());

        mockMvc.perform(delete("/api/notifications/notification-1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Notification deleted"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void clearAllReturnsCount() throws Exception {
        when(notificationService.clearAllNotifications("user-1")).thenReturn(Map.of("count", 3L));

        mockMvc.perform(delete("/api/notifications").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("All notifications cleared"));
    }

    private NotificationDto sampleNotification() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new NotificationDto(
                "notification-1",
                "user-1",
                NotificationType.SYSTEM,
                "System alert",
                "Check your dashboard",
                EntityType.COMMUNITY,
                "community-1",
                false,
                null,
                now,
                now);
    }
}
