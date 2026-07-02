package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.notification.NotificationCreateRequest;
import com.studyconnect.backend.dto.notification.NotificationDto;
import com.studyconnect.backend.dto.notification.PaginatedNotificationsDto;
import com.studyconnect.backend.entity.Notification;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.mapper.NotificationMapper;
import com.studyconnect.backend.repository.NotificationRepository;
import com.studyconnect.backend.websocket.RealtimeTopics;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notifications, MongoTemplate mongoTemplate, SimpMessagingTemplate messagingTemplate) {
        this.notifications = notifications;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    public PaginatedNotificationsDto listNotifications(String userId, int page, int limit, boolean unreadOnly) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId));
        if (unreadOnly) {
            query.addCriteria(Criteria.where("isRead").is(false));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("_id")));

        List<Notification> items = mongoTemplate.find(query, Notification.class);
        long total = mongoTemplate.count(buildCountQuery(userId, unreadOnly), Notification.class);
        List<NotificationDto> dtos = items.stream().map(NotificationMapper::toDto).toList();
        int pages = (int) Math.ceil((double) total / safeLimit);
        if (pages == 0) {
            pages = 1;
        }
        return new PaginatedNotificationsDto(dtos, total, safePage, safeLimit, pages);
    }

    public Map<String, Long> unreadCount(String userId) {
        return Map.of("count", notifications.countByUserIdAndIsReadFalse(userId));
    }

    public NotificationDto markAsRead(String notificationId, String userId) {
        Notification notification = requireOwnedNotification(notificationId, userId);
        if (notification.isRead()) {
            return NotificationMapper.toDto(notification);
        }
        notification.setRead(true);
        notification.setReadAt(Instant.now());
        Notification saved = notifications.save(notification);
        NotificationDto dto = NotificationMapper.toDto(saved);
        broadcastUpdate(userId, dto);
        return dto;
    }

    public Map<String, Long> markAllAsRead(String userId) {
        long count = 0;
        for (Notification notification : notifications.findAllByUserId(userId)) {
            if (notification.isRead()) {
                continue;
            }
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notifications.save(notification);
            count++;
        }
        messagingTemplate.convertAndSend(RealtimeTopics.notificationUnreadCount(userId), Map.of("count", 0L));
        return Map.of("count", count);
    }

    public NotificationDto deleteNotification(String notificationId, String userId) {
        Notification notification = requireOwnedNotification(notificationId, userId);
        notifications.deleteById(notificationId);
        NotificationDto dto = NotificationMapper.toDto(notification);
        messagingTemplate.convertAndSend(RealtimeTopics.notificationDeleted(userId), dto);
        messagingTemplate.convertAndSend(RealtimeTopics.notificationUnreadCount(userId), unreadCount(userId));
        return dto;
    }

    public Map<String, Long> clearAllNotifications(String userId) {
        long count = notifications.findAllByUserId(userId).size();
        notifications.deleteAll(notifications.findAllByUserId(userId));
        messagingTemplate.convertAndSend(RealtimeTopics.notificationUnreadCount(userId), Map.of("count", 0L));
        return Map.of("count", count);
    }

    public NotificationDto createNotification(NotificationCreateRequest request) {
        Notification notification = new Notification();
        notification.setUserId(request.userId());
        notification.setType(request.type());
        notification.setTitle(request.title().trim());
        notification.setMessage(request.message().trim());
        notification.setEntityType(request.entityType());
        notification.setEntityId(request.entityId());
        notification.setRead(false);
        notification.setReadAt(null);
        Notification saved = notifications.save(notification);
        NotificationDto dto = NotificationMapper.toDto(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.notificationCreated(request.userId()), dto);
        messagingTemplate.convertAndSend(RealtimeTopics.notificationUnreadCount(request.userId()), unreadCount(request.userId()));
        return dto;
    }

    private Notification requireOwnedNotification(String notificationId, String userId) {
        Notification notification = notifications.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification not found", "NOTIFICATION_NOT_FOUND"));
        if (!userId.equals(notification.getUserId())) {
            throw new NotFoundException("Notification not found", "NOTIFICATION_NOT_FOUND");
        }
        return notification;
    }

    private Query buildCountQuery(String userId, boolean unreadOnly) {
        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId));
        if (unreadOnly) {
            query.addCriteria(Criteria.where("isRead").is(false));
        }
        return query;
    }

    private void broadcastUpdate(String userId, NotificationDto dto) {
        messagingTemplate.convertAndSend(RealtimeTopics.notificationUpdated(userId), dto);
        messagingTemplate.convertAndSend(RealtimeTopics.notificationUnreadCount(userId), unreadCount(userId));
    }
}
