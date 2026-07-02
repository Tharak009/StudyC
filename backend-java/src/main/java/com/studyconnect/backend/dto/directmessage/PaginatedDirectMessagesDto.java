package com.studyconnect.backend.dto.directmessage;

import java.util.List;

public record PaginatedDirectMessagesDto(
        List<DirectMessageDto> items,
        long total,
        int page,
        int limit,
        int pages,
        String order) {
}
