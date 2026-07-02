package com.studyconnect.backend.dto.chat;

public record ChatAttachmentDto(String key, String url, String originalName, String mimeType, long size) {
}
