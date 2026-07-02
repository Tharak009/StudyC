package com.studyconnect.backend.dto.directmessage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EditDirectMessageRequest(
        @NotBlank(message = "Content is required")
        @Size(min = 1, max = 2000, message = "Content must be between 1 and 2000 characters")
        String content) {
}
