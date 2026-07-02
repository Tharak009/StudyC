package com.studyconnect.backend.dto.admin;

import com.studyconnect.backend.dto.community.CommunityDto;
import java.util.List;

public record PaginatedAdminCommunitiesDto(
        List<CommunityDto> items,
        long total,
        int page,
        int limit,
        int pages) {
}
