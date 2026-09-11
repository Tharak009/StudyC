package com.studyconnect.backend.event;

import com.studyconnect.backend.dto.directmessage.DirectMessageDto;

public record DirectMessageEvent(
        EventType type,
        String conversationId,
        DirectMessageDto message,
        Object payload
) {
    public enum EventType {
        CREATED,
        UPDATED,
        DELETED,
        READ
    }

    public static DirectMessageEvent created(String conversationId, DirectMessageDto message) {
        return new DirectMessageEvent(EventType.CREATED, conversationId, message, message);
    }

    public static DirectMessageEvent updated(String conversationId, DirectMessageDto message) {
        return new DirectMessageEvent(EventType.UPDATED, conversationId, message, message);
    }

    public static DirectMessageEvent deleted(String conversationId, DirectMessageDto message) {
        return new DirectMessageEvent(EventType.DELETED, conversationId, message, message);
    }

    public static DirectMessageEvent read(String conversationId, Object readPayload) {
        return new DirectMessageEvent(EventType.READ, conversationId, null, readPayload);
    }
}
