package com.studyconnect.backend.dto.user;

public record ActivityDto(
    String id,
    String type,
    String content,
    String timestamp
) {}
