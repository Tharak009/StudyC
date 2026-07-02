package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.admin.AdminDashboardStatsDto;
import com.studyconnect.backend.dto.admin.PaginatedAdminCommunitiesDto;
import com.studyconnect.backend.dto.admin.PaginatedReportsDto;
import com.studyconnect.backend.dto.admin.PaginatedUsersDto;
import com.studyconnect.backend.dto.admin.ReviewReportRequest;
import com.studyconnect.backend.dto.community.CommunityDto;
import com.studyconnect.backend.dto.report.ReportDto;
import com.studyconnect.backend.dto.resource.PaginatedResourcesDto;
import com.studyconnect.backend.dto.user.UserDto;
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
import com.studyconnect.backend.entity.enums.ReportTargetType;
import com.studyconnect.backend.entity.enums.ReportStatus;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.exception.BadRequestException;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.mapper.AdminMapper;
import com.studyconnect.backend.mapper.CommunityMapper;
import com.studyconnect.backend.mapper.ReportMapper;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final UserRepository users;
    private final CommunityRepository communities;
    private final CommunityMemberRepository communityMembers;
    private final ResourceRepository resources;
    private final MessageRepository messages;
    private final DirectMessageRepository directMessages;
    private final NotificationRepository notifications;
    private final RefreshTokenRepository refreshTokens;
    private final ReportRepository reports;
    private final AdminLogRepository adminLogs;
    private final MongoTemplate mongoTemplate;

    public AdminService(
            UserRepository users,
            CommunityRepository communities,
            CommunityMemberRepository communityMembers,
            ResourceRepository resources,
            MessageRepository messages,
            DirectMessageRepository directMessages,
            NotificationRepository notifications,
            RefreshTokenRepository refreshTokens,
            ReportRepository reports,
            AdminLogRepository adminLogs,
            MongoTemplate mongoTemplate) {
        this.users = users;
        this.communities = communities;
        this.communityMembers = communityMembers;
        this.resources = resources;
        this.messages = messages;
        this.directMessages = directMessages;
        this.notifications = notifications;
        this.refreshTokens = refreshTokens;
        this.reports = reports;
        this.adminLogs = adminLogs;
        this.mongoTemplate = mongoTemplate;
    }

    public AdminDashboardStatsDto getDashboardStats() {
        long userCount = users.count();
        long communityCount = communities.count();
        long resourceCount = resources.count();
        long reportCount = reports.countByStatus(ReportStatus.PENDING);
        long activeUsers = mongoTemplate.count(
                Query.query(Criteria.where("lastLogin").gte(Instant.now().minusSeconds(7L * 24 * 60 * 60))),
                User.class
        );
        List<Map<String, Object>> recentActivity = adminLogs.findTop10ByOrderByCreatedAtDesc().stream()
                .map(log -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("_id", log.getId());
                    User admin = log.getAdminId() == null ? null : users.findById(log.getAdminId()).orElse(null);
                    entry.put("adminId", admin == null ? null : Map.of(
                            "_id", admin.getId(),
                            "fullName", admin.getFullName(),
                            "rollNumber", admin.getRollNumber()
                    ));
                    entry.put("action", log.getAction());
                    entry.put("targetType", log.getTargetType());
                    entry.put("targetId", log.getTargetId());
                    entry.put("details", log.getDetails());
                    entry.put("createdAt", log.getCreatedAt());
                    return entry;
                })
                .toList();
        return new AdminDashboardStatsDto(userCount, communityCount, resourceCount, reportCount, activeUsers, recentActivity);
    }

    public PaginatedUsersDto listUsers(String search, String role, String status, int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            String escaped = PatternUtils.escape(search.trim());
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("fullName").regex(escaped, "i"),
                    Criteria.where("email").regex(escaped, "i"),
                    Criteria.where("rollNumber").regex(escaped, "i")
            ));
        }
        if (role != null && !role.isBlank()) {
            query.addCriteria(Criteria.where("role").is(parseRole(role)));
        }
        if (status != null && !status.isBlank()) {
            query.addCriteria(Criteria.where("status").is(parseUserStatus(status)));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        List<User> items = mongoTemplate.find(query, User.class);
        long total = mongoTemplate.count(buildUserCountQuery(search, role, status), User.class);
        List<UserDto> dtos = items.stream().map(this::toUserDto).toList();
        return new PaginatedUsersDto(dtos, total, safePage, safeLimit, pages(total, safeLimit));
    }

    public UserDto getUser(String userId) {
        return toUserDto(requireUser(userId));
    }

    public UserDto banUser(String adminId, String userId) {
        User user = requireMutableUser(adminId, userId);
        UserStatus previous = user.getStatus();
        user.setStatus(UserStatus.DEACTIVATED);
        users.save(user);
        log(adminId, "BAN_USER", "User", userId, Map.of("previousStatus", previous));
        return toUserDto(user);
    }

    public UserDto unbanUser(String adminId, String userId) {
        User user = requireMutableUser(adminId, userId);
        user.setStatus(UserStatus.ACTIVE);
        users.save(user);
        log(adminId, "UNBAN_USER", "User", userId, Map.of());
        return toUserDto(user);
    }

    public UserDto activateUser(String adminId, String userId) {
        User user = requireMutableUser(adminId, userId);
        user.setStatus(UserStatus.ACTIVE);
        users.save(user);
        log(adminId, "ACTIVATE_USER", "User", userId, Map.of());
        return toUserDto(user);
    }

    public UserDto suspendUser(String adminId, String userId) {
        User user = requireMutableUser(adminId, userId);
        user.setStatus(UserStatus.SUSPENDED);
        users.save(user);
        log(adminId, "SUSPEND_USER", "User", userId, Map.of());
        return toUserDto(user);
    }

    public void deleteUser(String adminId, String userId) {
        User user = requireMutableUser(adminId, userId);
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("fullName", user.getFullName());
        details.put("email", user.getEmail());
        details.put("rollNumber", user.getRollNumber());
        communityMembers.deleteAll(communityMembers.findAllByUserId(userId));
        notifications.deleteAll(notifications.findAllByUserId(userId));
        messages.findAllBySenderId(userId).forEach(message -> {
            message.setContent("[deleted user]");
            message.setDeleted(true);
            message.setDeletedAt(Instant.now());
            messages.save(message);
        });
        directMessages.findAllBySenderId(userId).forEach(message -> {
            message.setContent("[deleted user]");
            message.setDeleted(true);
            message.setDeletedAt(Instant.now());
            directMessages.save(message);
        });
        resources.deleteAll(resources.findAllByUploadedBy(userId));
        reports.deleteAll(reports.findAllByReporterId(userId));
        refreshTokens.deleteAllByUserId(userId);
        users.deleteById(userId);
        log(adminId, "DELETE_USER", "User", userId, details);
    }

    public PaginatedAdminCommunitiesDto listCommunities(String search, int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            String escaped = PatternUtils.escape(search.trim());
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("name").regex(escaped, "i"),
                    Criteria.where("description").regex(escaped, "i")
            ));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        List<Community> items = mongoTemplate.find(query, Community.class);
        long total = mongoTemplate.count(buildCommunityCountQuery(search), Community.class);
        List<CommunityDto> dtos = items.stream()
                .map(community -> CommunityMapper.toDto(community, CommunityMapper.toUserSummary(requireUser(community.getOwner()), false), null, false))
                .toList();
        return new PaginatedAdminCommunitiesDto(dtos, total, safePage, safeLimit, pages(total, safeLimit));
    }

    public void deleteCommunity(String adminId, String communityId) {
        Community community = requireCommunity(communityId);
        communityMembers.deleteAllByCommunityId(communityId);
        messages.deleteAll(messages.findAllByCommunityId(communityId));
        resources.deleteAll(resources.findAllByCommunityId(communityId));
        communities.deleteById(communityId);
        log(adminId, "DELETE_COMMUNITY", "Community", communityId, Map.of("name", community.getName(), "slug", community.getSlug()));
    }

    public PaginatedResourcesDto listResources(String search, int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            String escaped = PatternUtils.escape(search.trim());
            query.addCriteria(Criteria.where("title").regex(escaped, "i"));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        List<Resource> items = mongoTemplate.find(query, Resource.class);
        long total = mongoTemplate.count(buildResourceCountQuery(search), Resource.class);
        List<com.studyconnect.backend.dto.resource.ResourceDto> dtos = items.stream().map(resource -> {
            User uploader = requireUser(resource.getUploadedBy());
            Community community = requireCommunity(resource.getCommunityId());
            return com.studyconnect.backend.mapper.ResourceMapper.toDto(resource, uploader, community);
        }).toList();
        return new PaginatedResourcesDto(dtos, total, safePage, safeLimit, pages(total, safeLimit));
    }

    public void deleteResource(String adminId, String resourceId) {
        Resource resource = requireResource(resourceId);
        resources.deleteById(resourceId);
        log(adminId, "DELETE_RESOURCE", "Resource", resourceId, Map.of("title", resource.getTitle()));
    }

    public PaginatedReportsDto listReports(String status, String targetType, int page, int limit) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        Query query = new Query();
        if (status != null && !status.isBlank()) {
            query.addCriteria(Criteria.where("status").is(parseReportStatus(status)));
        }
        if (targetType != null && !targetType.isBlank()) {
            query.addCriteria(Criteria.where("targetType").is(parseReportTargetType(targetType)));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(Sort.Order.desc("createdAt")));
        List<Report> items = mongoTemplate.find(query, Report.class);
        long total = mongoTemplate.count(buildReportCountQuery(status, targetType), Report.class);
        List<ReportDto> dtos = items.stream().map(this::hydrateReport).toList();
        return new PaginatedReportsDto(dtos, total, safePage, safeLimit, pages(total, safeLimit));
    }

    public ReportDto reviewReport(String adminId, String reportId, ReviewReportRequest request) {
        Report report = requireReport(reportId);
        ReportStatus previous = report.getStatus();
        report.setStatus(request.status());
        report.setReviewedBy(adminId);
        report.setReviewedAt(Instant.now());
        if (request.description() != null) {
            report.setDescription(request.description());
        }
        Report saved = reports.save(report);
        log(adminId, "REVIEW_REPORT", "Report", reportId, Map.of("previousStatus", previous, "newStatus", request.status()));
        return hydrateReport(saved);
    }

    public void deleteMessage(String adminId, String messageId) {
        Message message = messages.findById(messageId).orElseThrow(() -> new NotFoundException("Message not found", "MESSAGE_NOT_FOUND"));
        messages.deleteById(messageId);
        log(adminId, "DELETE_MESSAGE", "Message", messageId, Map.of("communityId", message.getCommunityId()));
    }

    public void deleteDirectMessage(String adminId, String messageId) {
        DirectMessage message = directMessages.findById(messageId).orElseThrow(() -> new NotFoundException("Direct message not found", "DM_NOT_FOUND"));
        directMessages.deleteById(messageId);
        log(adminId, "DELETE_DIRECT_MESSAGE", "DirectMessage", messageId, Map.of());
    }

    private UserDto toUserDto(User user) {
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

    private User requireUser(String userId) {
        return users.findById(userId).orElseThrow(() -> new NotFoundException("User not found", "USER_NOT_FOUND"));
    }

    private Community requireCommunity(String communityId) {
        return communities.findById(communityId).orElseThrow(() -> new NotFoundException("Community not found", "COMMUNITY_NOT_FOUND"));
    }

    private Resource requireResource(String resourceId) {
        return resources.findById(resourceId).orElseThrow(() -> new NotFoundException("Resource not found", "RESOURCE_NOT_FOUND"));
    }

    private Report requireReport(String reportId) {
        return reports.findById(reportId).orElseThrow(() -> new NotFoundException("Report not found", "REPORT_NOT_FOUND"));
    }

    private User requireMutableUser(String adminId, String userId) {
        if (Objects.equals(adminId, userId)) {
            throw new ForbiddenException("Cannot perform this action on your own account", "SELF_ACTION_FORBIDDEN");
        }
        User user = requireUser(userId);
        if (user.getRole() == Role.ADMIN) {
            throw new ForbiddenException("Cannot perform this action on another admin", "ADMIN_PROTECTED");
        }
        return user;
    }

    private int pages(long total, int limit) {
        int pages = (int) Math.ceil((double) total / limit);
        return pages == 0 ? 1 : pages;
    }

    private Query buildUserCountQuery(String search, String role, String status) {
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            String escaped = PatternUtils.escape(search.trim());
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("fullName").regex(escaped, "i"),
                    Criteria.where("email").regex(escaped, "i"),
                    Criteria.where("rollNumber").regex(escaped, "i")
            ));
        }
        if (role != null && !role.isBlank()) {
            query.addCriteria(Criteria.where("role").is(parseRole(role)));
        }
        if (status != null && !status.isBlank()) {
            query.addCriteria(Criteria.where("status").is(parseUserStatus(status)));
        }
        return query;
    }

    private Query buildCommunityCountQuery(String search) {
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            String escaped = PatternUtils.escape(search.trim());
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("name").regex(escaped, "i"),
                    Criteria.where("description").regex(escaped, "i")
            ));
        }
        return query;
    }

    private Query buildResourceCountQuery(String search) {
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            String escaped = PatternUtils.escape(search.trim());
            query.addCriteria(Criteria.where("title").regex(escaped, "i"));
        }
        return query;
    }

    private Query buildReportCountQuery(String status, String targetType) {
        Query query = new Query();
        if (status != null && !status.isBlank()) {
            query.addCriteria(Criteria.where("status").is(parseReportStatus(status)));
        }
        if (targetType != null && !targetType.isBlank()) {
            query.addCriteria(Criteria.where("targetType").is(parseReportTargetType(targetType)));
        }
        return query;
    }

    private ReportDto hydrateReport(Report report) {
        User reporter = users.findById(report.getReporterId()).orElse(null);
        User reviewer = report.getReviewedBy() == null ? null : users.findById(report.getReviewedBy()).orElse(null);
        return ReportMapper.toDto(report, reporter, reviewer);
    }

    private void log(String adminId, String action, String targetType, String targetId, Map<String, Object> details) {
        AdminLog log = new AdminLog();
        log.setAdminId(adminId);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDetails(new HashMap<>(details));
        adminLogs.save(log);
    }

    private static final class PatternUtils {
        private PatternUtils() {
        }

        private static String escape(String value) {
            return value.replaceAll("([\\\\.*+?^${}()|\\[\\]])", "\\\\$1");
        }
    }

    private Role parseRole(String value) {
        try {
            return Role.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid role", "INVALID_ROLE");
        }
    }

    private UserStatus parseUserStatus(String value) {
        try {
            return UserStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid status", "INVALID_STATUS");
        }
    }

    private ReportStatus parseReportStatus(String value) {
        try {
            return ReportStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid report status", "INVALID_REPORT_STATUS");
        }
    }

    private ReportTargetType parseReportTargetType(String value) {
        try {
            return ReportTargetType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid report target type", "INVALID_REPORT_TARGET_TYPE");
        }
    }
}
