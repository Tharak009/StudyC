package com.studyconnect.backend.dto.resource;

import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UploadInitiateRequest(
        @NotBlank(message = "File name is required") String fileName,
        @Min(value = 1, message = "File size must be greater than 0") long fileSize,
        String mimeType,
        @Min(value = 1, message = "Total parts must be at least 1") int totalParts,
        @NotBlank(message = "Title is required") String title,
        String description,
        @NotNull(message = "Category is required") ResourceCategory category,
        ResourceVisibility visibility,
        List<String> tags
) {}
