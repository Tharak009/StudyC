package com.studyconnect.backend.dto.directmessage;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DirectMessageSenderDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber,
        String profilePicture) {
}
