package com.studyconnect.backend.dto.admin;

import com.studyconnect.backend.dto.user.UserDto;
import java.util.List;

public record PaginatedUsersDto(
        List<UserDto> items,
        long total,
        int page,
        int limit,
        int pages) {
}
