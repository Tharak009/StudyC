package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.service.NotificationService;
import com.studyconnect.backend.util.SecurityUtil;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ApiResponse<?> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            Authentication authentication) {
        return ApiResponse.success(
                notificationService.listNotifications(SecurityUtil.currentUserId(authentication), page, limit, unreadOnly),
                "Notifications retrieved"
        );
    }

    @GetMapping("/unread-count")
    public ApiResponse<?> unreadCount(Authentication authentication) {
        return ApiResponse.success(
                notificationService.unreadCount(SecurityUtil.currentUserId(authentication)),
                "Unread count retrieved"
        );
    }

    @PatchMapping("/{notificationId}/read")
    public ApiResponse<?> markAsRead(@PathVariable String notificationId, Authentication authentication) {
        return ApiResponse.success(
                notificationService.markAsRead(notificationId, SecurityUtil.currentUserId(authentication)),
                "Notification marked as read"
        );
    }

    @PatchMapping("/read-all")
    public ApiResponse<?> markAllAsRead(Authentication authentication) {
        return ApiResponse.success(
                notificationService.markAllAsRead(SecurityUtil.currentUserId(authentication)),
                "All notifications marked as read"
        );
    }

    @DeleteMapping("/{notificationId}")
    public ApiResponse<?> delete(@PathVariable String notificationId, Authentication authentication) {
        notificationService.deleteNotification(notificationId, SecurityUtil.currentUserId(authentication));
        return ApiResponse.success(null, "Notification deleted");
    }

    @DeleteMapping
    public ApiResponse<?> clearAll(Authentication authentication) {
        return ApiResponse.success(
                notificationService.clearAllNotifications(SecurityUtil.currentUserId(authentication)),
                "All notifications cleared"
        );
    }
}
