package com.studyconnect.backend.event;

import com.studyconnect.backend.websocket.RealtimeTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimeEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleChatEvent(ChatEvent event) {
        String communityId = event.communityId();
        switch (event.type()) {
            case CREATED -> messagingTemplate.convertAndSend(RealtimeTopics.communityMessageCreated(communityId), event.message());
            case UPDATED -> messagingTemplate.convertAndSend(RealtimeTopics.communityMessageUpdated(communityId), event.message());
            case DELETED -> messagingTemplate.convertAndSend(RealtimeTopics.communityMessageDeleted(communityId), event.message());
        }
    }

    @EventListener
    public void handleDirectMessageEvent(DirectMessageEvent event) {
        String conversationId = event.conversationId();
        switch (event.type()) {
            case CREATED -> messagingTemplate.convertAndSend(RealtimeTopics.directMessageCreated(conversationId), event.message());
            case UPDATED -> messagingTemplate.convertAndSend(RealtimeTopics.directMessageUpdated(conversationId), event.message());
            case DELETED -> messagingTemplate.convertAndSend(RealtimeTopics.directMessageDeleted(conversationId), event.message());
            case READ -> messagingTemplate.convertAndSend(RealtimeTopics.directMessageRead(conversationId), event.payload());
        }
    }

    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        String userId = event.userId();
        switch (event.type()) {
            case CREATED -> {
                messagingTemplate.convertAndSend(RealtimeTopics.notificationCreated(userId), event.notification());
                messagingTemplate.convertAndSend(RealtimeTopics.notificationUnreadCount(userId), Map.of("count", 1));
            }
            case UPDATED -> messagingTemplate.convertAndSend(RealtimeTopics.notificationUpdated(userId), event.notification());
            case DELETED -> messagingTemplate.convertAndSend(RealtimeTopics.notificationDeleted(userId), event.notification());
        }
    }
}
