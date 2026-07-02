package com.studyconnect.backend.dto.directmessage;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DirectMessageReplyDto(
        @JsonProperty("_id") String id,
        String content,
        boolean deleted,
        DirectMessageReplySenderDto senderId) {
}
