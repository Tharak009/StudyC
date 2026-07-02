package com.studyconnect.backend.dto.resource;

import java.util.List;

public record PaginatedResourcesDto(
        List<ResourceDto> items,
        long total,
        int page,
        int limit,
        int pages) {
}
