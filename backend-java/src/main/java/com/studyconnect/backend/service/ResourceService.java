package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.resource.PaginatedResourcesDto;
import com.studyconnect.backend.dto.resource.ResourceCreateRequest;
import com.studyconnect.backend.dto.resource.ResourceDto;
import com.studyconnect.backend.dto.resource.ResourceUpdateRequest;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.Resource;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import com.studyconnect.backend.exception.BadRequestException;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.mapper.ResourceMapper;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.CommunityRepository;
import com.studyconnect.backend.repository.ResourceRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ResourceService {

    private static final Set<String> RESOURCE_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/zip",
            "application/x-zip-compressed"
    );
    private static final long MAX_RESOURCE_BYTES = 50L * 1024 * 1024;

    private final ResourceRepository resources;
    private final CommunityMemberRepository members;
    private final CommunityRepository communities;
    private final UserRepository users;
    private final FileStorageService storageService;
    private final MongoTemplate mongoTemplate;

    public ResourceService(
            ResourceRepository resources,
            CommunityMemberRepository members,
            CommunityRepository communities,
            UserRepository users,
            FileStorageService storageService,
            MongoTemplate mongoTemplate) {
        this.resources = resources;
        this.members = members;
        this.communities = communities;
        this.users = users;
        this.storageService = storageService;
        this.mongoTemplate = mongoTemplate;
    }

    public PaginatedResourcesDto listResources(String communityId, String userId, int page, int limit, String search, String category, String tag, String sort) {
        if (communityId != null && !communityId.isBlank()) {
            requireMembership(communityId, userId);
        }
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        Query query = new Query();
        if (communityId != null && !communityId.isBlank()) {
            query.addCriteria(Criteria.where("communityId").is(communityId));
        }
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("title").regex(pattern),
                    Criteria.where("description").regex(pattern),
                    Criteria.where("tags").regex(pattern)
            ));
        }
        if (category != null && !category.isBlank()) {
            query.addCriteria(Criteria.where("category").is(parseCategory(category)));
        }
        if (tag != null && !tag.isBlank()) {
            query.addCriteria(Criteria.where("tags").is(tag.trim().toLowerCase(Locale.ROOT)));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(sort(sort));

        List<Resource> items = mongoTemplate.find(query, Resource.class);
        long total = mongoTemplate.count(buildCountQuery(communityId, search, category, tag), Resource.class);
        return pageDto(items, total, safePage, safeLimit);
    }

    public ResourceDto getResource(String resourceId, String userId) {
        Resource resource = requireResource(resourceId);
        requireMembership(resource.getCommunityId(), userId);
        return hydrate(resource);
    }

    public ResourceDto createResource(String communityId, String userId, ResourceCreateRequest request, MultipartFile file) {
        requireMembership(communityId, userId);
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required", "FILE_REQUIRED");
        }
        FileStorageService.StoredFile stored = storageService.store(file, "resources", RESOURCE_MIME_TYPES, MAX_RESOURCE_BYTES);

        Resource resource = new Resource();
        resource.setTitle(normalizeTitle(request.title()));
        resource.setDescription(normalizeDescription(request.description()));
        resource.setFileName(file.getOriginalFilename() == null ? stored.originalName() : file.getOriginalFilename());
        resource.setFileUrl(stored.url());
        resource.setFileSize(stored.size());
        resource.setFileType(stored.mimeType());
        resource.setCategory(request.category());
        resource.setTags(normalizeTags(request.tags()));
        resource.setUploadedBy(userId);
        resource.setCommunityId(communityId);
        resource.setVisibility(request.visibility() == null ? ResourceVisibility.COMMUNITY : request.visibility());

        Resource saved = resources.save(resource);
        return hydrate(requireResource(saved.getId()));
    }

    public ResourceDto updateResource(String resourceId, String userId, ResourceUpdateRequest request, MultipartFile file) {
        Resource resource = requireResource(resourceId);
        if (!Objects.equals(resource.getUploadedBy(), userId)) {
            throw new ForbiddenException("Only the uploader can edit this resource", "RESOURCE_EDIT_FORBIDDEN");
        }

        if (request.title() != null) resource.setTitle(normalizeTitle(request.title()));
        if (request.description() != null) resource.setDescription(normalizeDescription(request.description()));
        if (request.category() != null) resource.setCategory(request.category());
        if (request.tags() != null) resource.setTags(normalizeTags(request.tags()));
        if (request.visibility() != null) resource.setVisibility(request.visibility());

        if (file != null && !file.isEmpty()) {
            FileStorageService.StoredFile stored = storageService.store(file, "resources", RESOURCE_MIME_TYPES, MAX_RESOURCE_BYTES);
            String oldKey = resource.getFileUrl() == null ? null : resource.getFileUrl().replaceFirst("^/uploads/", "");
            resource.setFileName(file.getOriginalFilename() == null ? stored.originalName() : file.getOriginalFilename());
            resource.setFileUrl(stored.url());
            resource.setFileSize(stored.size());
            resource.setFileType(stored.mimeType());
            if (oldKey != null && !oldKey.isBlank()) {
                storageService.deleteByKey(oldKey);
            }
        }

        Resource saved = resources.save(resource);
        return hydrate(requireResource(saved.getId()));
    }

    public void deleteResource(String resourceId, String userId) {
        Resource resource = requireResource(resourceId);
        CommunityMember membership = requireMembership(resource.getCommunityId(), userId);
        boolean isUploader = Objects.equals(resource.getUploadedBy(), userId);
        boolean isOwner = membership.getRole() == CommunityRole.OWNER;
        boolean isModerator = membership.getRole() == CommunityRole.MODERATOR;
        if (!isUploader && !isOwner && !isModerator) {
            throw new ForbiddenException("Only owners, moderators, and the uploader can delete this resource", "RESOURCE_DELETE_FORBIDDEN");
        }
        resources.deleteById(resourceId);
        if (resource.getFileUrl() != null && !resource.getFileUrl().isBlank()) {
            storageService.deleteByKey(resource.getFileUrl().replaceFirst("^/uploads/", ""));
        }
    }

    public ResourceDto trackDownload(String resourceId, String userId) {
        Resource resource = requireResource(resourceId);
        requireMembership(resource.getCommunityId(), userId);
        resource.setDownloadCount(resource.getDownloadCount() + 1);
        Resource saved = resources.save(resource);
        return hydrate(requireResource(saved.getId()));
    }

    private PaginatedResourcesDto pageDto(List<Resource> items, long total, int page, int limit) {
        List<ResourceDto> dtos = items.stream().map(this::hydrate).toList();
        return ResourceMapper.toPage(dtos, total, page, limit);
    }

    private ResourceDto hydrate(Resource resource) {
        User uploader = users.findById(resource.getUploadedBy())
                .orElseThrow(() -> new NotFoundException("User not found", "USER_NOT_FOUND"));
        Community community = communities.findById(resource.getCommunityId())
                .orElseThrow(() -> new NotFoundException("Community not found", "COMMUNITY_NOT_FOUND"));
        return ResourceMapper.toDto(resource, uploader, community);
    }

    private Resource requireResource(String resourceId) {
        return resources.findById(resourceId)
                .orElseThrow(() -> new NotFoundException("Resource not found", "RESOURCE_NOT_FOUND"));
    }

    private CommunityMember requireMembership(String communityId, String userId) {
        CommunityMember membership = members.findByCommunityIdAndUserId(communityId, userId)
                .orElseThrow(() -> new ForbiddenException("Community membership is required", "RESOURCE_MEMBERSHIP_REQUIRED"));
        return membership;
    }

    private Query buildCountQuery(String communityId, String search, String category, String tag) {
        Query query = new Query();
        if (communityId != null && !communityId.isBlank()) {
            query.addCriteria(Criteria.where("communityId").is(communityId));
        }
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("title").regex(pattern),
                    Criteria.where("description").regex(pattern),
                    Criteria.where("tags").regex(pattern)
            ));
        }
        if (category != null && !category.isBlank()) {
            query.addCriteria(Criteria.where("category").is(parseCategory(category)));
        }
        if (tag != null && !tag.isBlank()) {
            query.addCriteria(Criteria.where("tags").is(tag.trim().toLowerCase(Locale.ROOT)));
        }
        return query;
    }

    private Sort sort(String sort) {
        if ("downloads".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.desc("downloadCount"), Sort.Order.desc("createdAt"));
        }
        if ("name".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.asc("title"));
        }
        return Sort.by(Sort.Order.desc("createdAt"));
    }

    private ResourceCategory parseCategory(String value) {
        try {
            return ResourceCategory.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (Exception exception) {
            throw new BadRequestException("Invalid resource category", "INVALID_RESOURCE_CATEGORY");
        }
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return new ArrayList<>();
        }
        return tags.stream()
                .filter(Objects::nonNull)
                .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
                .filter(tag -> !tag.isBlank())
                .distinct()
                .limit(10)
                .toList();
    }

    private String normalizeTitle(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new BadRequestException("Title is required", "TITLE_REQUIRED");
        }
        return normalized;
    }

    private String normalizeDescription(String value) {
        return value == null ? "" : value.trim();
    }
}
