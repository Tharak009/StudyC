package com.studyconnect.backend.dto.chat;

import java.util.List;

public record PaginatedChatMessagesDto(
        List<ChatMessageDto> items,
        long total,
        int page,
        int limit,
        int pages,
        String order) {
}
