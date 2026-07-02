package com.studyconnect.backend.dto.directmessage;

import jakarta.validation.constraints.NotBlank;

public record StartConversationRequest(
        @NotBlank(message = "Receiver id is required")
        String receiverId) {
}
