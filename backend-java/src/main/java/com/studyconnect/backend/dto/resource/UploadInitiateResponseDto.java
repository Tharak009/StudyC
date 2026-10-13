package com.studyconnect.backend.dto.resource;

public record UploadInitiateResponseDto(
        String sessionId,
        String uploadId,
        String key,
        int totalParts,
        long partSize,
        boolean directCloud
) {}
