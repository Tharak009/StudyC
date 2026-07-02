package com.studyconnect.backend.dto.community;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.CommunityCategory;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.CommunityVisibility;
import java.time.Instant;
import java.util.List;

public record CommunityDto(
        @JsonProperty("_id") String id,
        String name,
        String slug,
        String description,
        String bannerImage,
        CommunityCategory category,
        List<String> tags,
        CommunityVisibility visibility,
        CommunityUserDto owner,
        List<String> moderators,
        long memberCount,
        CommunityExtensionPointsDto extensionPoints,
        CommunityRole membershipRole,
        boolean isMember,
        Instant createdAt,
        Instant updatedAt) {
}
