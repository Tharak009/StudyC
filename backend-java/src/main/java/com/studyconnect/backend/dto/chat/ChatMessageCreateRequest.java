package com.studyconnect.backend.dto.chat;

public record ChatMessageCreateRequest(String content, String replyTo) {
}
