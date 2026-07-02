package com.studyconnect.backend.dto.resource;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import java.time.Instant;
import java.util.List;

public record ResourceDto(
        @JsonProperty("_id") String id,
        String title,
        String description,
        String fileName,
        String fileUrl,
        long fileSize,
        String fileType,
        ResourceCategory category,
        List<String> tags,
        ResourceUploaderDto uploadedBy,
        ResourceCommunityDto communityId,
        long downloadCount,
        ResourceVisibility visibility,
        Instant createdAt,
        Instant updatedAt) {
}
