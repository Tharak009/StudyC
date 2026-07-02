package com.studyconnect.backend.dto.community;

import com.studyconnect.backend.validation.AtLeastOneCommunityField;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

@AtLeastOneCommunityField
public record CommunityUpdateRequest(
        @Size(min = 3, max = 50) String name,
        @Size(max = 1000) String description,
        String category,
        @Size(max = 10) List<@Size(min = 1, max = 30) String> tags,
        String visibility,
        MultipartFile bannerImage) {

    public CommunityUpdateRequest {
        name = normalize(name);
        description = normalize(description);
        category = normalize(category);
        visibility = normalize(visibility);
        if (tags != null) {
            tags = List.copyOf(new ArrayList<>(new LinkedHashSet<>(
                    tags.stream()
                            .map(CommunityUpdateRequest::normalizeTag)
                            .toList()
            )));
        }
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private static String normalizeTag(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }
}
