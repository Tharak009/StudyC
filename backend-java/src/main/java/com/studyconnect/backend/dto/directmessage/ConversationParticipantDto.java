package com.studyconnect.backend.dto.directmessage;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ConversationParticipantDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber,
        String profilePicture,
        String department) {
}
