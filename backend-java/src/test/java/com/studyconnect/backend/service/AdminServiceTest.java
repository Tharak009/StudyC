package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.dto.admin.ReviewReportRequest;
import com.studyconnect.backend.entity.AdminLog;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.DirectMessage;
import com.studyconnect.backend.entity.Message;
import com.studyconnect.backend.entity.Notification;
import com.studyconnect.backend.entity.RefreshToken;
import com.studyconnect.backend.entity.Report;
import com.studyconnect.backend.entity.Resource;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.ReportStatus;
import com.studyconnect.backend.entity.enums.ReportTargetType;
import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.repository.AdminLogRepository;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.CommunityRepository;
import com.studyconnect.backend.repository.DirectMessageRepository;
import com.studyconnect.backend.repository.MessageRepository;
import com.studyconnect.backend.repository.NotificationRepository;
import com.studyconnect.backend.repository.RefreshTokenRepository;
import com.studyconnect.backend.repository.ReportRepository;
import com.studyconnect.backend.repository.ResourceRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private UserRepository users;
    @Mock private CommunityRepository communities;
    @Mock private CommunityMemberRepository communityMembers;
    @Mock private ResourceRepository resources;
    @Mock private MessageRepository messages;
    @Mock private DirectMessageRepository directMessages;
    @Mock private NotificationRepository notifications;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private ReportRepository reports;
    @Mock private AdminLogRepository adminLogs;
    @Mock private MongoTemplate mongoTemplate;

    @Test
    void deleteUserScrubsContentAndRemovesRelatedData() {
        User target = baseUser("user-1", Role.STUDENT, UserStatus.ACTIVE);
        when(users.findById("user-1")).thenReturn(Optional.of(target));
        when(communityMembers.findAllByUserId("user-1")).thenReturn(List.of(member("community-1", "user-1")));
        when(notifications.findAllByUserId("user-1")).thenReturn(List.of(notification("notification-1", "user-1")));
        when(messages.findAllBySenderId("user-1")).thenReturn(List.of(message("message-1", "community-1", "user-1")));
        when(directMessages.findAllBySenderId("user-1")).thenReturn(List.of(directMessage("dm-1", "conversation-1", "user-1")));
        when(resources.findAllByUploadedBy("user-1")).thenReturn(List.of(resource("resource-1", "user-1", "community-1")));
        when(reports.findAllByReporterId("user-1")).thenReturn(List.of(report("report-1", "user-1")));

        AdminService service = new AdminService(
                users,
                communities,
                communityMembers,
                resources,
                messages,
                directMessages,
                notifications,
                refreshTokens,
                reports,
                adminLogs,
                mongoTemplate);

        service.deleteUser("admin-1", "user-1");

        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        ArgumentCaptor<DirectMessage> directMessageCaptor = ArgumentCaptor.forClass(DirectMessage.class);
        ArgumentCaptor<AdminLog> logCaptor = ArgumentCaptor.forClass(AdminLog.class);

        verify(messages).save(messageCaptor.capture());
        verify(directMessages).save(directMessageCaptor.capture());
        verify(resources).deleteAll(any());
        verify(reports).deleteAll(any());
        verify(refreshTokens).deleteAllByUserId("user-1");
        verify(users).deleteById("user-1");
        verify(adminLogs).save(logCaptor.capture());

        assertThat(messageCaptor.getValue().isDeleted()).isTrue();
        assertThat(messageCaptor.getValue().getContent()).isEqualTo("[deleted user]");
        assertThat(directMessageCaptor.getValue().isDeleted()).isTrue();
        assertThat(directMessageCaptor.getValue().getContent()).isEqualTo("[deleted user]");
        assertThat(logCaptor.getValue().getAction()).isEqualTo("DELETE_USER");
        assertThat(logCaptor.getValue().getTargetType()).isEqualTo("User");
        assertThat(logCaptor.getValue().getTargetId()).isEqualTo("user-1");
    }

    @Test
    void reviewReportUpdatesStatusAndReturnsHydratedDto() {
        Report report = report("report-1", "reporter-1");
        when(reports.findById("report-1")).thenReturn(Optional.of(report));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("reporter-1")).thenReturn(Optional.of(baseUser("reporter-1", Role.STUDENT, UserStatus.ACTIVE)));
        when(users.findById("admin-1")).thenReturn(Optional.of(baseUser("admin-1", Role.ADMIN, UserStatus.ACTIVE)));
        when(adminLogs.save(any(AdminLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminService service = new AdminService(
                users,
                communities,
                communityMembers,
                resources,
                messages,
                directMessages,
                notifications,
                refreshTokens,
                reports,
                adminLogs,
                mongoTemplate);

        var result = service.reviewReport("admin-1", "report-1", new ReviewReportRequest(ReportStatus.RESOLVED, "Reviewed"));

        assertThat(result.status()).isEqualTo(ReportStatus.RESOLVED);
        assertThat(result.description()).isEqualTo("Reviewed");
        assertThat(result.reviewedBy()).isNotNull();
        assertThat(result.reviewedBy().id()).isEqualTo("admin-1");
        assertThat(result.reporterId()).isNotNull();
        assertThat(result.reporterId().id()).isEqualTo("reporter-1");
        verify(adminLogs).save(any(AdminLog.class));
    }

    @Test
    void getDashboardStatsPopulatesAdminSummary() {
        when(users.count()).thenReturn(11L);
        when(communities.count()).thenReturn(7L);
        when(resources.count()).thenReturn(5L);
        when(reports.countByStatus(ReportStatus.PENDING)).thenReturn(2L);
        when(mongoTemplate.count(any(Query.class), eq(User.class))).thenReturn(4L);
        AdminLog log = new AdminLog();
        log.setId("log-1");
        log.setAdminId("admin-1");
        log.setAction("DELETE_USER");
        log.setTargetType("User");
        log.setTargetId("user-1");
        log.setDetails(Map.of("reason", "cleanup"));
        log.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        when(adminLogs.findTop10ByOrderByCreatedAtDesc()).thenReturn(List.of(log));
        when(users.findById("admin-1")).thenReturn(Optional.of(baseUser("admin-1", Role.ADMIN, UserStatus.ACTIVE)));

        AdminService service = new AdminService(
                users,
                communities,
                communityMembers,
                resources,
                messages,
                directMessages,
                notifications,
                refreshTokens,
                reports,
                adminLogs,
                mongoTemplate);

        var stats = service.getDashboardStats();

        assertThat(stats.userCount()).isEqualTo(11L);
        assertThat(stats.recentActivity()).hasSize(1);
        assertThat(stats.recentActivity().get(0).get("adminId")).isInstanceOf(Map.class);
    }

    private User baseUser(String id, Role role, UserStatus status) {
        User user = new User();
        user.setId(id);
        user.setFullName(id.equals("admin-1") ? "Admin User" : "Student One");
        user.setRollNumber(id.equals("admin-1") ? "ADM01" : "CSE01");
        user.setEmail(id + "@college.edu");
        user.setRole(role);
        user.setStatus(status);
        return user;
    }

    private CommunityMember member(String communityId, String userId) {
        CommunityMember member = new CommunityMember();
        member.setCommunityId(communityId);
        member.setUserId(userId);
        member.setRole(CommunityRole.MEMBER);
        return member;
    }

    private Notification notification(String id, String userId) {
        Notification notification = new Notification();
        notification.setId(id);
        notification.setUserId(userId);
        return notification;
    }

    private Message message(String id, String communityId, String senderId) {
        Message message = new Message();
        message.setId(id);
        message.setCommunityId(communityId);
        message.setSenderId(senderId);
        message.setContent("Hello");
        return message;
    }

    private DirectMessage directMessage(String id, String conversationId, String senderId) {
        DirectMessage message = new DirectMessage();
        message.setId(id);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setContent("Direct hello");
        return message;
    }

    private Resource resource(String id, String uploadedBy, String communityId) {
        Resource resource = new Resource();
        resource.setId(id);
        resource.setTitle("Notes");
        resource.setUploadedBy(uploadedBy);
        resource.setCommunityId(communityId);
        resource.setCategory(ResourceCategory.NOTES);
        resource.setVisibility(ResourceVisibility.COMMUNITY);
        return resource;
    }

    private Report report(String id, String reporterId) {
        Report report = new Report();
        report.setId(id);
        report.setReporterId(reporterId);
        report.setTargetType(ReportTargetType.USER);
        report.setTargetId("target-1");
        report.setReason("Spam");
        report.setDescription("Details");
        report.setStatus(ReportStatus.PENDING);
        return report;
    }
}
