package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.dto.resource.ResourceCreateRequest;
import com.studyconnect.backend.dto.resource.ResourceUpdateRequest;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.Resource;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityCategory;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.CommunityVisibility;
import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.CommunityRepository;
import com.studyconnect.backend.repository.ResourceRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock private ResourceRepository resources;
    @Mock private CommunityMemberRepository members;
    @Mock private CommunityRepository communities;
    @Mock private UserRepository users;
    @Mock private FileStorageService storageService;
    @Mock private MongoTemplate mongoTemplate;

    @Test
    void createResourceStoresFileAndReturnsDto() {
        when(members.findByCommunityIdAndUserId("community-1", "user-1")).thenReturn(Optional.of(membership("community-1", "user-1", CommunityRole.MEMBER)));
        when(storageService.store(any(MultipartFile.class), eq("resources"), any(), eq(50L * 1024 * 1024))).thenReturn(
                new FileStorageService.StoredFile("resources/file.pdf", "/uploads/resources/file.pdf", "file.pdf", "application/pdf", 1024L, Instant.now()));
        when(resources.save(any(Resource.class))).thenAnswer(invocation -> {
            Resource resource = invocation.getArgument(0);
            resource.setId("resource-1");
            resource.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            resource.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            return resource;
        });
        when(resources.findById("resource-1")).thenReturn(Optional.of(baseResource("resource-1")));
        when(users.findById("user-1")).thenReturn(Optional.of(baseUser("user-1")));
        when(communities.findById("community-1")).thenReturn(Optional.of(baseCommunity("community-1")));

        ResourceService service = new ResourceService(resources, members, communities, users, storageService, mongoTemplate);
        var result = service.createResource(
                "community-1",
                "user-1",
                new ResourceCreateRequest("Notes", "Summary", ResourceCategory.NOTES, List.of("Spring", "Java"), ResourceVisibility.COMMUNITY),
                new MockMultipartFile("file", "file.pdf", "application/pdf", new byte[] {1, 2})
        );

        assertThat(result.id()).isEqualTo("resource-1");
        assertThat(result.title()).isEqualTo("Notes");
    }

    @Test
    void deleteResourceAllowsUploader() {
        Resource resource = baseResource("resource-1");
        resource.setUploadedBy("user-1");
        when(resources.findById("resource-1")).thenReturn(Optional.of(resource));
        when(members.findByCommunityIdAndUserId("community-1", "user-1")).thenReturn(Optional.of(membership("community-1", "user-1", CommunityRole.MEMBER)));

        ResourceService service = new ResourceService(resources, members, communities, users, storageService, mongoTemplate);
        service.deleteResource("resource-1", "user-1");

        verify(resources).deleteById("resource-1");
    }

    @Test
    void updateResourceRejectsNonUploader() {
        Resource resource = baseResource("resource-1");
        resource.setUploadedBy("user-1");
        when(resources.findById("resource-1")).thenReturn(Optional.of(resource));

        ResourceService service = new ResourceService(resources, members, communities, users, storageService, mongoTemplate);
        assertThrows(ForbiddenException.class, () -> service.updateResource(
                "resource-1",
                "user-2",
                new ResourceUpdateRequest("Updated", null, null, null, null),
                null
        ));
    }

    @Test
    void trackDownloadIncrementsDownloadCount() {
        Resource resource = baseResource("resource-1");
        when(resources.findById("resource-1")).thenReturn(Optional.of(resource));
        when(members.findByCommunityIdAndUserId("community-1", "user-1")).thenReturn(Optional.of(membership("community-1", "user-1", CommunityRole.MEMBER)));
        when(resources.save(any(Resource.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("user-1")).thenReturn(Optional.of(baseUser("user-1")));
        when(communities.findById("community-1")).thenReturn(Optional.of(baseCommunity("community-1")));

        ResourceService service = new ResourceService(resources, members, communities, users, storageService, mongoTemplate);
        var result = service.trackDownload("resource-1", "user-1");

        assertThat(result.downloadCount()).isEqualTo(1L);
    }

    private CommunityMember membership(String communityId, String userId, CommunityRole role) {
        CommunityMember member = new CommunityMember();
        member.setCommunityId(communityId);
        member.setUserId(userId);
        member.setRole(role);
        return member;
    }

    private Resource baseResource(String id) {
        Resource resource = new Resource();
        resource.setId(id);
        resource.setTitle("Notes");
        resource.setDescription("Summary");
        resource.setFileName("file.pdf");
        resource.setFileUrl("/uploads/resources/file.pdf");
        resource.setFileSize(1024L);
        resource.setFileType("application/pdf");
        resource.setCategory(ResourceCategory.NOTES);
        resource.setTags(List.of("spring"));
        resource.setUploadedBy("user-1");
        resource.setCommunityId("community-1");
        resource.setDownloadCount(0L);
        resource.setVisibility(ResourceVisibility.COMMUNITY);
        resource.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        resource.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return resource;
    }

    private Community baseCommunity(String id) {
        Community community = new Community();
        community.setId(id);
        community.setName("Study Club");
        community.setSlug("study-club");
        community.setCategory(CommunityCategory.WEB_DEVELOPMENT);
        community.setVisibility(CommunityVisibility.PUBLIC);
        return community;
    }

    private User baseUser(String id) {
        User user = new User();
        user.setId(id);
        user.setFullName("Student One");
        user.setRollNumber("RN-1");
        user.setProfilePicture("/uploads/profiles/avatar.png");
        return user;
    }
}
