package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.community.CommunityCreateRequest;
import com.studyconnect.backend.dto.community.CommunityDto;
import com.studyconnect.backend.dto.community.CommunityMemberDto;
import com.studyconnect.backend.dto.community.CommunityPageDto;
import com.studyconnect.backend.dto.community.CommunityUpdateRequest;
import com.studyconnect.backend.dto.community.ModeratorRequest;
import com.studyconnect.backend.service.CommunityService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/communities")
public class CommunityController {

    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<CommunityDto>> create(@Valid @ModelAttribute CommunityCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(201).body(ApiResponse.success(communityService.create(request, SecurityUtil.currentUserId(authentication)), "Community created"));
    }

    @GetMapping
    public ApiResponse<CommunityPageDto> list(
            @RequestParam(name = "search", required = false) @Size(max = 100) String search,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "limit", defaultValue = "12") @Min(1) @Max(50) int limit,
            Authentication authentication) {
        return ApiResponse.success(communityService.list(search, category, page, limit, SecurityUtil.currentUserId(authentication)), "Communities retrieved");
    }

    @GetMapping("/{id}")
    public ApiResponse<CommunityDto> details(@PathVariable String id, Authentication authentication) {
        return ApiResponse.success(communityService.details(id, SecurityUtil.currentUserId(authentication)), "Community retrieved");
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ApiResponse<CommunityDto> update(
            @PathVariable String id,
            @Valid @ModelAttribute CommunityUpdateRequest request,
            Authentication authentication) {
        return ApiResponse.success(communityService.update(id, request, SecurityUtil.currentUserId(authentication)), "Community updated");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id, Authentication authentication) {
        communityService.delete(id, SecurityUtil.currentUserId(authentication));
        return ApiResponse.success(null, "Community deleted");
    }

    @PostMapping("/{id}/join")
    public ApiResponse<CommunityDto> join(@PathVariable String id, Authentication authentication) {
        return ApiResponse.success(communityService.join(id, SecurityUtil.currentUserId(authentication)), "Joined community");
    }

    @PostMapping("/{id}/leave")
    public ApiResponse<Void> leave(@PathVariable String id, Authentication authentication) {
        communityService.leave(id, SecurityUtil.currentUserId(authentication));
        return ApiResponse.success(null, "Left community");
    }

    @GetMapping("/{id}/members")
    public ApiResponse<List<CommunityMemberDto>> members(@PathVariable String id, Authentication authentication) {
        return ApiResponse.success(communityService.membersList(id, SecurityUtil.currentUserId(authentication)), "Community members retrieved");
    }

    @PostMapping("/{id}/moderators")
    public ApiResponse<List<CommunityMemberDto>> addModerator(
            @PathVariable String id,
            @Valid @RequestBody ModeratorRequest request,
            Authentication authentication) {
        return ApiResponse.success(communityService.addModerator(id, request.userId(), SecurityUtil.currentUserId(authentication)), "Moderator added");
    }

    @DeleteMapping("/{id}/moderators/{userId}")
    public ApiResponse<List<CommunityMemberDto>> removeModerator(
            @PathVariable String id,
            @PathVariable String userId,
            Authentication authentication) {
        return ApiResponse.success(communityService.removeModerator(id, userId, SecurityUtil.currentUserId(authentication)), "Moderator removed");
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ApiResponse<List<CommunityMemberDto>> removeMember(
            @PathVariable String id,
            @PathVariable String userId,
            Authentication authentication) {
        return ApiResponse.success(communityService.removeMember(id, userId, SecurityUtil.currentUserId(authentication)), "Member removed");
    }
}
