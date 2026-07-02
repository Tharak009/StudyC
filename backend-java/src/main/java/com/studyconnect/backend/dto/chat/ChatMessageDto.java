package com.studyconnect.backend.dto.chat;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.dto.community.CommunityUserDto;
import com.studyconnect.backend.entity.enums.MessageType;
import java.time.Instant;
import java.util.List;

public record ChatMessageDto(
        @JsonProperty("_id") String id,
        String communityId,
        CommunityUserDto senderId,
        String content,
        MessageType messageType,
        List<ChatAttachmentDto> attachments,
        ChatReplyDto replyTo,
        boolean edited,
        Instant editedAt,
        boolean deleted,
        Instant deletedAt,
        Instant createdAt,
        Instant updatedAt) {
}
