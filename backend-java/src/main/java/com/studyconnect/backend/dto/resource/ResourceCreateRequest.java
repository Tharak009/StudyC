package com.studyconnect.backend.dto.resource;

import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ResourceCreateRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be at most 200 characters")
        String title,

        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        @NotNull(message = "Category is required")
        ResourceCategory category,

        @Size(max = 10, message = "A maximum of 10 tags is allowed")
        List<@Size(max = 30, message = "Each tag must be at most 30 characters") String> tags,

        ResourceVisibility visibility) {
}
