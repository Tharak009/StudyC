package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.user.UserDto;
import com.studyconnect.backend.dto.user.UserProfileUpdateRequest;
import com.studyconnect.backend.dto.user.StudentDashboardDto;
import com.studyconnect.backend.service.UserService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ApiResponse<UserDto> profile(Authentication authentication) {
        return ApiResponse.success(userService.getProfile(SecurityUtil.currentUserId(authentication)), "Profile retrieved");
    }

    @PutMapping("/profile")
    public ApiResponse<UserDto> updateProfile(@Valid @RequestBody UserProfileUpdateRequest request, Authentication authentication) {
        return ApiResponse.success(userService.updateProfile(SecurityUtil.currentUserId(authentication), request), "Profile updated");
    }

    @PostMapping(value = "/profile-picture", consumes = "multipart/form-data")
    public ApiResponse<UserDto> uploadProfilePicture(
            @RequestParam("profilePicture") MultipartFile profilePicture,
            Authentication authentication) {
        return ApiResponse.success(userService.uploadProfilePicture(SecurityUtil.currentUserId(authentication), profilePicture), "Profile picture updated");
    }

    @GetMapping("/dashboard")
    public ApiResponse<StudentDashboardDto> dashboard(Authentication authentication) {
        return ApiResponse.success(userService.getDashboardData(SecurityUtil.currentUserId(authentication)), "Dashboard data retrieved");
    }

    @GetMapping("/search")
    public ApiResponse<List<UserDto>> search(@RequestParam(name = "q", defaultValue = "") String query, Authentication authentication) {
        return ApiResponse.success(userService.search(query, SecurityUtil.currentUserId(authentication)), "Users found");
    }
}
