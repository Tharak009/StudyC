package com.studyconnect.backend.dto.resource;

public record DownloadUrlResponseDto(
        String downloadUrl,
        long expiresAtSeconds
) {}
