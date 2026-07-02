package com.studyconnect.backend.dto.community;

import java.util.List;

public record CommunityPageDto(List<CommunityDto> items, long total, int page, int limit, int pages) {
}
