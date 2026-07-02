package com.studyconnect.backend.dto.community;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.CommunityRole;
import java.time.Instant;

public record CommunityMemberDto(
        @JsonProperty("_id") String id,
        String communityId,
        CommunityUserDto userId,
        CommunityRole role,
        Instant joinedAt) {
}
