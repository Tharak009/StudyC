package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.community.CommunityDto;
import com.studyconnect.backend.dto.community.CommunityExtensionPointsDto;
import com.studyconnect.backend.dto.community.CommunityMemberDto;
import com.studyconnect.backend.dto.community.CommunityUserDto;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityRole;
import java.util.List;

public final class CommunityMapper {

    private CommunityMapper() {
    }

    public static CommunityDto toDto(Community community, CommunityUserDto owner, CommunityRole membershipRole, boolean isMember) {
        return new CommunityDto(
                community.getId(),
                community.getName(),
                community.getSlug(),
                community.getDescription(),
                community.getBannerImage(),
                community.getCategory(),
                community.getTags(),
                community.getVisibility(),
                owner,
                List.copyOf(community.getModerators()),
                community.getMemberCount(),
                new CommunityExtensionPointsDto(
                        community.getExtensionPoints().isChatEnabled(),
                        community.getExtensionPoints().isResourcesEnabled(),
                        community.getExtensionPoints().isNotificationsEnabled()
                ),
                membershipRole,
                isMember,
                community.getCreatedAt(),
                community.getUpdatedAt()
        );
    }

    public static CommunityMemberDto toMemberDto(CommunityMember member, CommunityUserDto user) {
        return new CommunityMemberDto(member.getId(), member.getCommunityId(), user, member.getRole(), member.getJoinedAt());
    }

    public static CommunityUserDto toUserSummary(User user, boolean includeStudyFields) {
        return new CommunityUserDto(
                user.getId(),
                user.getFullName(),
                user.getRollNumber(),
                includeStudyFields ? user.getDepartment() : null,
                includeStudyFields ? user.getAcademicYear() : null,
                user.getProfilePicture()
        );
    }
}
