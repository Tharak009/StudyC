package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.dto.community.CommunityCreateRequest;
import com.studyconnect.backend.dto.community.CommunityUpdateRequest;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityCategory;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.CommunityVisibility;
import com.studyconnect.backend.exception.ApiException;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.CommunityRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {

    @Mock private CommunityRepository communities;
    @Mock private CommunityMemberRepository members;
    @Mock private UserRepository users;
    @Mock private FileStorageService storageService;
    @Mock private MongoTemplate mongoTemplate;

    @Test
    void createCommunityCreatesOwnerMembership() {
        User owner = baseUser("owner-1");
        when(users.findById("owner-1")).thenReturn(Optional.of(owner));
        when(communities.findByNameIgnoreCase("Study Club")).thenReturn(Optional.empty());
        when(communities.findBySlugIgnoreCase("study-club")).thenReturn(Optional.empty());
        when(communities.save(any(Community.class))).thenAnswer(invocation -> {
            Community community = invocation.getArgument(0);
            community.setId("community-1");
            return community;
        });
        when(members.save(any(CommunityMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(members.findByCommunityIdAndUserId("community-1", "owner-1")).thenAnswer(invocation -> {
            CommunityMember ownerMembership = new CommunityMember();
            ownerMembership.setCommunityId("community-1");
            ownerMembership.setUserId("owner-1");
            ownerMembership.setRole(CommunityRole.OWNER);
            return Optional.of(ownerMembership);
        });

        CommunityService service = new CommunityService(communities, members, users, storageService, mongoTemplate);
        var result = service.create(new CommunityCreateRequest(
                "Study Club",
                "A place to learn",
                "Web Development",
                List.of("React", "React", "Java"),
                "public",
                null
        ), "owner-1");

        assertThat(result.id()).isEqualTo("community-1");
        assertThat(result.membershipRole()).isEqualTo(CommunityRole.OWNER);
        verify(members).save(any(CommunityMember.class));
    }

    @Test
    void joinCreatesMembershipAndIncrementsCount() {
        Community community = baseCommunity("community-1");
        community.setMemberCount(1);
        when(communities.findById("community-1")).thenReturn(Optional.of(community));
        when(members.findByCommunityIdAndUserId("community-1", "user-2")).thenReturn(Optional.empty());
        when(members.save(any(CommunityMember.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(communities.save(any(Community.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("owner-1")).thenReturn(Optional.of(baseUser("owner-1")));
        when(members.findByCommunityIdAndUserId("community-1", "user-2")).thenReturn(Optional.empty());

        CommunityService service = new CommunityService(communities, members, users, storageService, mongoTemplate);
        var result = service.join("community-1", "user-2");

        assertThat(result.isMember()).isTrue();
        assertThat(result.membershipRole()).isEqualTo(CommunityRole.MEMBER);
    }

    @Test
    void leaveRejectsOwner() {
        Community community = baseCommunity("community-1");
        when(communities.findById("community-1")).thenReturn(Optional.of(community));
        CommunityMember ownerMembership = new CommunityMember();
        ownerMembership.setCommunityId("community-1");
        ownerMembership.setUserId("owner-1");
        ownerMembership.setRole(CommunityRole.OWNER);
        when(members.findByCommunityIdAndUserId("community-1", "owner-1")).thenReturn(Optional.of(ownerMembership));

        CommunityService service = new CommunityService(communities, members, users, storageService, mongoTemplate);
        ApiException exception = assertThrows(ApiException.class, () -> service.leave("community-1", "owner-1"));

        assertThat(exception.getCode()).isEqualTo("OWNER_CANNOT_LEAVE");
    }

    @Test
    void membersListRequiresMembership() {
        when(communities.findById("community-1")).thenReturn(Optional.of(baseCommunity("community-1")));
        when(members.findByCommunityIdAndUserId("community-1", "user-2")).thenReturn(Optional.empty());

        CommunityService service = new CommunityService(communities, members, users, storageService, mongoTemplate);
        assertThrows(ApiException.class, () -> service.membersList("community-1", "user-2"));
    }

    @Test
    void updateCommunityRenamesSlugAndDeletesOldBanner() {
        Community community = baseCommunity("community-1");
        community.setBannerImage("/uploads/communities/old.png");
        when(communities.findById("community-1")).thenReturn(Optional.of(community));
        CommunityMember ownerMembership = new CommunityMember();
        ownerMembership.setCommunityId("community-1");
        ownerMembership.setUserId("owner-1");
        ownerMembership.setRole(CommunityRole.OWNER);
        when(members.findByCommunityIdAndUserId("community-1", "owner-1")).thenReturn(Optional.of(ownerMembership));
        when(communities.findByNameIgnoreCase("New Club")).thenReturn(Optional.empty());
        when(communities.findBySlugIgnoreCase("new-club")).thenReturn(Optional.empty());
        when(storageService.store(any(MultipartFile.class), anyString(), any(), anyLong()))
                .thenReturn(new FileStorageService.StoredFile(
                        "communities/new.png",
                        "/uploads/communities/new.png",
                        "new.png",
                        "image/png",
                        10L,
                        Instant.now()));
        when(communities.save(any(Community.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("owner-1")).thenReturn(Optional.of(baseUser("owner-1")));

        CommunityService service = new CommunityService(communities, members, users, storageService, mongoTemplate);
        var result = service.update("community-1", new CommunityUpdateRequest(
                "New Club",
                "Updated description",
                "Java Programming",
                List.of("Spring"),
                "private",
                new org.springframework.mock.web.MockMultipartFile("bannerImage", "new.png", "image/png", new byte[] {1})
        ), "owner-1");

        assertThat(result.name()).isEqualTo("New Club");
        verify(storageService).deleteByKey("communities/old.png");
    }

    private Community baseCommunity(String id) {
        Community community = new Community();
        community.setId(id);
        community.setName("Study Club");
        community.setSlug("study-club");
        community.setDescription("A place to learn");
        community.setCategory(CommunityCategory.WEB_DEVELOPMENT);
        community.setVisibility(CommunityVisibility.PUBLIC);
        community.setOwner("owner-1");
        community.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        community.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return community;
    }

    private User baseUser(String id) {
        User user = new User();
        user.setId(id);
        user.setFullName("Owner One");
        user.setRollNumber("CSE01");
        user.setDepartment("CSE");
        user.setAcademicYear(2);
        user.setEmail(id + "@college.edu");
        return user;
    }
}
