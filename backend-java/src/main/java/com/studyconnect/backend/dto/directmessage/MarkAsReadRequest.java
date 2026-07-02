package com.studyconnect.backend.dto.directmessage;

import jakarta.validation.constraints.NotBlank;

public record MarkAsReadRequest(
        @NotBlank(message = "Conversation id is required")
        String conversationId) {
}
