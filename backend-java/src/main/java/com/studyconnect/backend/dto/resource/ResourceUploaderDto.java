package com.studyconnect.backend.dto.resource;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ResourceUploaderDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber,
        String profilePicture) {
}
