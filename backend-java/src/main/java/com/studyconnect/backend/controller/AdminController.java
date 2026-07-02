package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.admin.ReviewReportRequest;
import com.studyconnect.backend.service.AdminService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@Validated
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public ApiResponse<?> dashboard() {
        return ApiResponse.success(adminService.getDashboardStats(), "Dashboard stats retrieved");
    }

    @GetMapping("/users")
    public ApiResponse<?> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(adminService.listUsers(search, role, status, page, limit), "Users retrieved");
    }

    @GetMapping("/users/{userId}")
    public ApiResponse<?> getUser(@PathVariable String userId) {
        return ApiResponse.success(adminService.getUser(userId), "User retrieved");
    }

    @PatchMapping("/users/{userId}/ban")
    public ApiResponse<?> banUser(@PathVariable String userId, Authentication authentication) {
        return ApiResponse.success(adminService.banUser(SecurityUtil.currentUserId(authentication), userId), "User banned");
    }

    @PatchMapping("/users/{userId}/unban")
    public ApiResponse<?> unbanUser(@PathVariable String userId, Authentication authentication) {
        return ApiResponse.success(adminService.unbanUser(SecurityUtil.currentUserId(authentication), userId), "User unbanned");
    }

    @PatchMapping("/users/{userId}/activate")
    public ApiResponse<?> activateUser(@PathVariable String userId, Authentication authentication) {
        return ApiResponse.success(adminService.activateUser(SecurityUtil.currentUserId(authentication), userId), "User activated");
    }

    @PatchMapping("/users/{userId}/suspend")
    public ApiResponse<?> suspendUser(@PathVariable String userId, Authentication authentication) {
        return ApiResponse.success(adminService.suspendUser(SecurityUtil.currentUserId(authentication), userId), "User suspended");
    }

    @DeleteMapping("/users/{userId}")
    public ApiResponse<?> deleteUser(@PathVariable String userId, Authentication authentication) {
        adminService.deleteUser(SecurityUtil.currentUserId(authentication), userId);
        return ApiResponse.success(null, "User deleted");
    }

    @GetMapping("/communities")
    public ApiResponse<?> listCommunities(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(adminService.listCommunities(search, page, limit), "Communities retrieved");
    }

    @DeleteMapping("/communities/{communityId}")
    public ApiResponse<?> deleteCommunity(@PathVariable String communityId, Authentication authentication) {
        adminService.deleteCommunity(SecurityUtil.currentUserId(authentication), communityId);
        return ApiResponse.success(null, "Community deleted");
    }

    @GetMapping("/resources")
    public ApiResponse<?> listResources(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(adminService.listResources(search, page, limit), "Resources retrieved");
    }

    @DeleteMapping("/resources/{resourceId}")
    public ApiResponse<?> deleteResource(@PathVariable String resourceId, Authentication authentication) {
        adminService.deleteResource(SecurityUtil.currentUserId(authentication), resourceId);
        return ApiResponse.success(null, "Resource deleted");
    }

    @GetMapping("/reports")
    public ApiResponse<?> listReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String targetType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.success(adminService.listReports(status, targetType, page, limit), "Reports retrieved");
    }

    @PatchMapping("/reports/{reportId}")
    public ApiResponse<?> reviewReport(
            @PathVariable String reportId,
            @Valid @RequestBody ReviewReportRequest request,
            Authentication authentication) {
        return ApiResponse.success(
                adminService.reviewReport(SecurityUtil.currentUserId(authentication), reportId, request),
                "Report reviewed"
        );
    }

    @DeleteMapping("/messages/{messageId}")
    public ApiResponse<?> deleteMessage(@PathVariable String messageId, Authentication authentication) {
        adminService.deleteMessage(SecurityUtil.currentUserId(authentication), messageId);
        return ApiResponse.success(null, "Message deleted");
    }

    @DeleteMapping("/direct-messages/{messageId}")
    public ApiResponse<?> deleteDirectMessage(@PathVariable String messageId, Authentication authentication) {
        adminService.deleteDirectMessage(SecurityUtil.currentUserId(authentication), messageId);
        return ApiResponse.success(null, "Direct message deleted");
    }
}
