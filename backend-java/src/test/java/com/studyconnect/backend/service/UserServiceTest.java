package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.dto.user.UserProfileUpdateRequest;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.NotificationRepository;
import com.studyconnect.backend.repository.DirectMessageRepository;
import com.studyconnect.backend.repository.ConversationRepository;
import com.studyconnect.backend.repository.ResourceRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository users;
    @Mock private FileStorageService storageService;
    @Mock private CommunityMemberRepository members;
    @Mock private NotificationRepository notifications;
    @Mock private DirectMessageRepository directMessages;
    @Mock private ConversationRepository conversations;
    @Mock private ResourceRepository resources;

    private UserService service;

    @BeforeEach
    void setUp() {
        service = new UserService(users, storageService, members, notifications, directMessages, conversations, resources);
    }

    @Test
    void updateProfileTrimsAndDeduplicatesInterests() {
        User user = baseUser();
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.updateProfile("user-1", new UserProfileUpdateRequest(
                "  Student Name  ",
                "  CSE  ",
                3,
                "  Active learner  ",
                List.of("React", "React", "Systems")
        ));

        assertThat(result.fullName()).isEqualTo("Student Name");
        assertThat(result.department()).isEqualTo("CSE");
        assertThat(result.bio()).isEqualTo("Active learner");
        assertThat(result.interests()).containsExactly("React", "Systems");
    }

    @Test
    void uploadProfilePictureDeletesPreviousFile() {
        User user = baseUser();
        user.setProfilePicture("/uploads/profiles/old-file.png");
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(storageService.store(any(MultipartFile.class), any(), any(), anyLong()))
                .thenReturn(new FileStorageService.StoredFile(
                        "profiles/new-file.png",
                        "/uploads/profiles/new-file.png",
                        "new-file.png",
                        "image/png",
                        123L,
                        java.time.Instant.now()));

        service.uploadProfilePicture("user-1", new org.springframework.mock.web.MockMultipartFile(
                "profilePicture",
                "new-file.png",
                "image/png",
                new byte[] {1, 2, 3}));

        verify(storageService).deleteByKey("profiles/old-file.png");
    }

    @Test
    void searchReturnsEmptyListForShortQuery() {
        assertThat(service.search("a", "user-1")).isEmpty();
    }

    @Test
    void getProfileThrowsWhenMissing() {
        when(users.findById("missing")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getProfile("missing"));
    }

    private User baseUser() {
        User user = new User();
        user.setId("user-1");
        user.setFullName("Student One");
        user.setRollNumber("CSE01");
        user.setDepartment("CSE");
        user.setAcademicYear(2);
        user.setEmail("student@college.edu");
        return user;
    }
}
