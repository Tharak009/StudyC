package com.studyconnect.backend.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import java.time.Instant;
import java.util.List;

public record UserDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber,
        String department,
        Integer academicYear,
        String email,
        String profilePicture,
        String bio,
        List<String> interests,
        Role role,
        UserStatus status,
        Instant lastLogin,
        Instant createdAt,
        Instant updatedAt) {
}
