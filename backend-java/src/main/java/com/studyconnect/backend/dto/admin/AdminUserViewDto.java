package com.studyconnect.backend.dto.admin;

import com.studyconnect.backend.dto.user.UserDto;

public record AdminUserViewDto(
        UserDto user,
        long reportCount,
        long notificationCount,
        long resourceCount,
        long communityMembershipCount) {
}
