package com.studyconnect.backend.dto.community;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public record CommunityCreateRequest(
        @NotBlank @Size(min = 3, max = 50) String name,
        @Size(max = 1000) String description,
        @NotBlank String category,
        @Size(max = 10) List<@Size(min = 1, max = 30) String> tags,
        String visibility,
        MultipartFile bannerImage) {

    public CommunityCreateRequest {
        name = normalize(name);
        description = normalizeBlank(description);
        category = normalize(category);
        visibility = normalizeBlank(visibility);
        if (tags != null) {
            tags = List.copyOf(new ArrayList<>(new LinkedHashSet<>(
                    tags.stream()
                            .map(CommunityCreateRequest::normalizeTag)
                            .toList()
            )));
        }
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private static String normalizeBlank(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeTag(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }
}
