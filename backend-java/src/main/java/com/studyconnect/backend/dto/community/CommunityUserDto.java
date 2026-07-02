package com.studyconnect.backend.dto.community;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CommunityUserDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber,
        String department,
        Integer academicYear,
        String profilePicture) {
}
