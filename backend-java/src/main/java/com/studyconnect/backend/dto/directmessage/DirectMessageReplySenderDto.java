package com.studyconnect.backend.dto.directmessage;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DirectMessageReplySenderDto(
        @JsonProperty("_id") String id,
        String fullName) {
}
