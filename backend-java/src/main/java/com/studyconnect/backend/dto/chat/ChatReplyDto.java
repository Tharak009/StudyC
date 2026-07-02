package com.studyconnect.backend.dto.chat;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.dto.community.CommunityUserDto;

public record ChatReplyDto(
        @JsonProperty("_id") String id,
        String content,
        boolean deleted,
        CommunityUserDto senderId) {
}
