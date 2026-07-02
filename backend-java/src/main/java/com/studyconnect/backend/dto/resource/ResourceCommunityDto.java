package com.studyconnect.backend.dto.resource;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ResourceCommunityDto(
        @JsonProperty("_id") String id,
        String name,
        String slug) {
}
