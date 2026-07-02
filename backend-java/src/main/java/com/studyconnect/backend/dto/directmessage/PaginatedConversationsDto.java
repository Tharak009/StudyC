package com.studyconnect.backend.dto.directmessage;

import java.util.List;

public record PaginatedConversationsDto(
        List<ConversationDto> items,
        long total,
        int page,
        int limit,
        int pages) {
}
