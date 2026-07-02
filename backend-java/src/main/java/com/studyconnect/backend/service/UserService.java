package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.user.UserDto;
import com.studyconnect.backend.dto.user.UserProfileUpdateRequest;
import com.studyconnect.backend.dto.user.StudentDashboardDto;
import com.studyconnect.backend.dto.user.StudentStatsDto;
import com.studyconnect.backend.dto.user.ActivityDto;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.NotificationRepository;
import com.studyconnect.backend.repository.DirectMessageRepository;
import com.studyconnect.backend.repository.ConversationRepository;
import com.studyconnect.backend.repository.ResourceRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserService {

    private final UserRepository users;
    private final FileStorageService storageService;
    private final CommunityMemberRepository members;
    private final NotificationRepository notifications;
    private final DirectMessageRepository directMessages;
    private final ConversationRepository conversations;
    private final ResourceRepository resources;

    public UserService(
            UserRepository users,
            FileStorageService storageService,
            CommunityMemberRepository members,
            NotificationRepository notifications,
            DirectMessageRepository directMessages,
            ConversationRepository conversations,
            ResourceRepository resources) {
        this.users = users;
        this.storageService = storageService;
        this.members = members;
        this.notifications = notifications;
        this.directMessages = directMessages;
        this.conversations = conversations;
        this.resources = resources;
    }

    public StudentDashboardDto getDashboardData(String userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND"));

        // 1. Calculate profile completion percentage
        int filled = 0;
        int totalFields = 8;
        if (user.getFullName() != null && !user.getFullName().isBlank()) filled++;
        if (user.getEmail() != null && !user.getEmail().isBlank()) filled++;
        if (user.getRollNumber() != null && !user.getRollNumber().isBlank()) filled++;
        if (user.getDepartment() != null && !user.getDepartment().isBlank()) filled++;
        if (user.getAcademicYear() != null) filled++;
        if (user.getProfilePicture() != null && !user.getProfilePicture().isBlank()) filled++;
        if (user.getBio() != null && !user.getBio().isBlank()) filled++;
        if (user.getInterests() != null && !user.getInterests().isEmpty()) filled++;
        int profileCompletion = (int) Math.round(((double) filled / totalFields) * 100);

        // 2. Fetch stats
        long communitiesJoined = members.findAllByUserId(userId).size();
        long upcomingEvents = 2; // Mock count matching static event list
        long unreadMessages = conversations.findAllByParticipantsContains(userId).stream()
                .mapToLong(c -> directMessages.countByConversationIdAndReadFalseAndSenderIdNot(c.getId(), userId))
                .sum();
        long unreadNotifications = notifications.countByUserIdAndIsReadFalse(userId);
        long projectsShared = resources.findAllByUploadedBy(userId).size();

        StudentStatsDto stats = new StudentStatsDto(
                communitiesJoined,
                upcomingEvents,
                unreadMessages,
                unreadNotifications,
                projectsShared
        );

        // 3. Activity timeline (clean initial activity timeline list)
        List<ActivityDto> recentActivity = new ArrayList<>();
        recentActivity.add(new ActivityDto("act-1", "JOINED_COMMUNITY", "You joined the Java Coding Club community.", "2 hours ago"));
        recentActivity.add(new ActivityDto("act-2", "UPLOADED_RESOURCE", "You shared a study resource: React Cheat Sheet.pdf.", "1 day ago"));

        return new StudentDashboardDto(profileCompletion, stats, recentActivity);
    }

    public UserDto getProfile(String userId) {
        return toDto(users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND")));
    }

    public UserDto updateProfile(String userId, UserProfileUpdateRequest update) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND"));
        if (update.fullName() != null) user.setFullName(update.fullName());
        if (update.department() != null) user.setDepartment(update.department());
        if (update.academicYear() != null) user.setAcademicYear(update.academicYear());
        if (update.bio() != null) user.setBio(update.bio());
        if (update.interests() != null) user.setInterests(new ArrayList<>(new LinkedHashSet<>(update.interests())));
        return toDto(users.save(user));
    }

    public UserDto uploadProfilePicture(String userId, MultipartFile file) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND"));
        String previousProfilePicture = user.getProfilePicture();
        FileStorageService.StoredFile stored = storageService.store(
                file,
                "profiles",
                java.util.Set.of("image/jpeg", "image/png", "image/webp"),
                5L * 1024 * 1024
        );
        user.setProfilePicture(stored.url());
        User saved = users.save(user);
        deletePreviousProfilePicture(previousProfilePicture);
        return toDto(saved);
    }

    public List<UserDto> search(String query, String currentUserId) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return users.findTop20ByFullNameContainingIgnoreCaseOrRollNumberContainingIgnoreCaseOrEmailContainingIgnoreCase(
                        query.trim(), query.trim(), query.trim())
                .stream()
                .filter(user -> !user.getId().equals(currentUserId))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getFullName(),
                user.getRollNumber(),
                user.getDepartment(),
                user.getAcademicYear(),
                user.getEmail(),
                user.getProfilePicture(),
                user.getBio(),
                user.getInterests(),
                user.getRole(),
                user.getStatus(),
                user.getLastLogin(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private void deletePreviousProfilePicture(String previousProfilePicture) {
        if (previousProfilePicture == null || previousProfilePicture.isBlank()) {
            return;
        }
        String key = previousProfilePicture.replaceFirst("^/uploads/", "");
        if (!Objects.equals(key, previousProfilePicture)) {
            storageService.deleteByKey(key);
        }
    }
}
