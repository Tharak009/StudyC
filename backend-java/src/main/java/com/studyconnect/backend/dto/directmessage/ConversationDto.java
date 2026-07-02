package com.studyconnect.backend.dto.directmessage;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

public record ConversationDto(
        @JsonProperty("_id") String id,
        List<ConversationParticipantDto> participants,
        ConversationLastMessageDto lastMessage,
        Instant lastMessageAt,
        Instant createdAt,
        Instant updatedAt) {
}
