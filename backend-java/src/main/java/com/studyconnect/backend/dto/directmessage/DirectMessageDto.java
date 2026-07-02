package com.studyconnect.backend.dto.directmessage;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.MessageType;
import java.time.Instant;
import java.util.List;

public record DirectMessageDto(
        @JsonProperty("_id") String id,
        String conversationId,
        DirectMessageSenderDto senderId,
        String content,
        MessageType messageType,
        List<DirectMessageAttachmentDto> attachments,
        DirectMessageReplyDto replyTo,
        boolean edited,
        Instant editedAt,
        boolean read,
        Instant readAt,
        boolean deleted,
        Instant deletedAt,
        Instant createdAt,
        Instant updatedAt) {
}
