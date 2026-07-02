package com.studyconnect.backend.dto.directmessage;

public record DirectMessageAttachmentDto(
        String key,
        String url,
        String originalName,
        String mimeType,
        long size) {
}
