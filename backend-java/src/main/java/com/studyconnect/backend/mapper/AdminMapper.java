package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.admin.AdminUserViewDto;
import com.studyconnect.backend.dto.community.CommunityDto;
import com.studyconnect.backend.dto.user.UserDto;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.User;

public final class AdminMapper {

    private AdminMapper() {
    }

    public static CommunityDto toAdminCommunityDto(Community community, User owner) {
        return CommunityMapper.toDto(
                community,
                CommunityMapper.toUserSummary(owner, false),
                null,
                false
        );
    }

    public static AdminUserViewDto toUserView(UserDto user, long reportCount, long notificationCount, long resourceCount, long communityMembershipCount) {
        return new AdminUserViewDto(user, reportCount, notificationCount, resourceCount, communityMembershipCount);
    }
}
