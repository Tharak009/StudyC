package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.resource.ResourceCreateRequest;
import com.studyconnect.backend.dto.resource.ResourceUpdateRequest;
import com.studyconnect.backend.service.ResourceService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequestMapping
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping({"/api/communities/{communityId}/resources", "/api/resources"})
    public ApiResponse<?> list(
            @PathVariable(required = false) String communityId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "recent") String sort,
            Authentication authentication) {
        return ApiResponse.success(
                resourceService.listResources(communityId, SecurityUtil.currentUserId(authentication), page, limit, search, category, tag, sort),
                "Resources retrieved"
        );
    }

    @GetMapping("/api/resources/{resourceId}")
    public ApiResponse<?> getById(@PathVariable String resourceId, Authentication authentication) {
        return ApiResponse.success(
                resourceService.getResource(resourceId, SecurityUtil.currentUserId(authentication)),
                "Resource retrieved"
        );
    }

    @PostMapping("/api/communities/{communityId}/resources")
    public ResponseEntity<ApiResponse<?>> create(
            @PathVariable String communityId,
            @Valid @ModelAttribute ResourceCreateRequest request,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                resourceService.createResource(communityId, SecurityUtil.currentUserId(authentication), request, file),
                "Resource uploaded"
        ));
    }

    @PutMapping("/api/resources/{resourceId}")
    public ApiResponse<?> update(
            @PathVariable String resourceId,
            @Valid @ModelAttribute ResourceUpdateRequest request,
            @RequestParam(required = false) MultipartFile file,
            Authentication authentication) {
        return ApiResponse.success(
                resourceService.updateResource(resourceId, SecurityUtil.currentUserId(authentication), request, file),
                "Resource updated"
        );
    }

    @DeleteMapping("/api/resources/{resourceId}")
    public ApiResponse<?> delete(@PathVariable String resourceId, Authentication authentication) {
        resourceService.deleteResource(resourceId, SecurityUtil.currentUserId(authentication));
        return ApiResponse.success(null, "Resource deleted");
    }

    @PostMapping("/api/resources/{resourceId}/download")
    public ApiResponse<?> download(@PathVariable String resourceId, Authentication authentication) {
        return ApiResponse.success(
                resourceService.trackDownload(resourceId, SecurityUtil.currentUserId(authentication)),
                "Download tracked"
        );
    }
}
