package com.studyconnect.backend.dto.directmessage;

import java.time.Instant;

public record ConversationLastMessageDto(
        String content,
        String senderId,
        Instant createdAt) {
}
