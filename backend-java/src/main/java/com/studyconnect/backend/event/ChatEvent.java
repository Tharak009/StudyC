package com.studyconnect.backend.event;

import com.studyconnect.backend.dto.chat.ChatMessageDto;

public record ChatEvent(
        EventType type,
        String communityId,
        ChatMessageDto message
) {
    public enum EventType {
        CREATED,
        UPDATED,
        DELETED
    }
}
