package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.community.CommunityCreateRequest;
import com.studyconnect.backend.dto.community.CommunityDto;
import com.studyconnect.backend.dto.community.CommunityMemberDto;
import com.studyconnect.backend.dto.community.CommunityPageDto;
import com.studyconnect.backend.dto.community.CommunityUpdateRequest;
import com.studyconnect.backend.dto.community.CommunityUserDto;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityCategory;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.CommunityVisibility;
import com.studyconnect.backend.exception.BadRequestException;
import com.studyconnect.backend.exception.ConflictException;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.mapper.CommunityMapper;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.CommunityRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
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
public class CommunityService {

    private static final Set<String> BANNER_MIME_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_BANNER_BYTES = 5L * 1024 * 1024;
    private static final Comparator<CommunityMember> MEMBER_ORDER = Comparator
            .comparing((CommunityMember member) -> member.getRole() == null ? 99 : member.getRole().ordinal())
            .thenComparing(CommunityMember::getJoinedAt, Comparator.nullsLast(Comparator.naturalOrder()));

    private final CommunityRepository communities;
    private final CommunityMemberRepository members;
    private final UserRepository users;
    private final FileStorageService storageService;
    private final MongoTemplate mongoTemplate;

    public CommunityService(
            CommunityRepository communities,
            CommunityMemberRepository members,
            UserRepository users,
            FileStorageService storageService,
            MongoTemplate mongoTemplate) {
        this.communities = communities;
        this.members = members;
        this.users = users;
        this.storageService = storageService;
        this.mongoTemplate = mongoTemplate;
    }

    public CommunityDto create(CommunityCreateRequest request, String ownerId) {
        assertNameAvailable(request.name());
        MultipartFile banner = request.bannerImage();
        String bannerImage = banner == null ? null : storageService.store(banner, "communities", BANNER_MIME_TYPES, MAX_BANNER_BYTES).url();

        Community community = new Community();
        community.setName(request.name());
        community.setSlug(uniqueSlug(request.name(), null));
        community.setDescription(request.description() == null ? "" : request.description());
        community.setBannerImage(bannerImage);
        community.setCategory(parseCategory(request.category()));
        community.setTags(normalizeTags(request.tags()));
        community.setVisibility(parseVisibility(request.visibility()));
        community.setOwner(ownerId);
        community.getExtensionPoints().setChatEnabled(false);
        community.getExtensionPoints().setResourcesEnabled(false);
        community.getExtensionPoints().setNotificationsEnabled(false);
        community.setMemberCount(1);
        community = communities.save(community);

        CommunityMember ownerMembership = new CommunityMember();
        ownerMembership.setCommunityId(community.getId());
        ownerMembership.setUserId(ownerId);
        ownerMembership.setRole(CommunityRole.OWNER);
        members.save(ownerMembership);

        return toCommunityDto(community, ownerId);
    }

    public CommunityPageDto list(String search, String category, int page, int limit, String viewerId) {
        List<String> visibleIds = members.findAllByUserId(viewerId).stream()
                .map(CommunityMember::getCommunityId)
                .toList();

        Query query = new Query();
        List<Criteria> criteria = new ArrayList<>();
        criteria.add(new Criteria().orOperator(
                Criteria.where("visibility").is(CommunityVisibility.PUBLIC),
                Criteria.where("_id").in(visibleIds)
        ));
        if (category != null && !category.isBlank()) {
            criteria.add(Criteria.where("category").is(parseCategory(category)));
        }
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            criteria.add(new Criteria().orOperator(
                    Criteria.where("name").regex(pattern),
                    Criteria.where("description").regex(pattern),
                    Criteria.where("tags").regex(pattern)
            ));
        }
        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }
        query.with(PageRequest.of(page - 1, limit));
        query.with(Sort.by(Sort.Order.desc("memberCount"), Sort.Order.desc("createdAt")));

        List<Community> items = mongoTemplate.find(query, Community.class);
        Query countQuery = new Query();
        if (!criteria.isEmpty()) {
            countQuery.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }
        long total = mongoTemplate.count(countQuery, Community.class);

        List<CommunityDto> dtos = items.stream()
                .map(community -> toCommunityDto(community, viewerId))
                .toList();
        int pages = (int) Math.ceil((double) total / limit);
        if (pages == 0) {
            pages = 1;
        }
        return new CommunityPageDto(dtos, total, page, limit, pages);
    }

    public CommunityDto details(String id, String viewerId) {
        Community community = requireCommunity(id);
        CommunityMember viewerMembership = members.findByCommunityIdAndUserId(id, viewerId).orElse(null);
        if (community.getVisibility() == CommunityVisibility.PRIVATE && viewerMembership == null) {
            throw new ForbiddenException("This private community is available to members only", "PRIVATE_COMMUNITY");
        }
        return toCommunityDto(community, viewerId);
    }

    public CommunityDto update(String id, CommunityUpdateRequest request, String actorId) {
        Community community = requireCommunity(id);
        requireOwner(id, actorId);
        if (request.name() != null && !request.name().equalsIgnoreCase(community.getName())) {
            assertNameAvailable(request.name());
        }

        MultipartFile banner = request.bannerImage();
        String nextBanner = banner == null ? null : storageService.store(banner, "communities", BANNER_MIME_TYPES, MAX_BANNER_BYTES).url();
        if (request.name() != null) {
            community.setName(request.name());
            community.setSlug(uniqueSlug(request.name(), community.getId()));
        }
        if (request.description() != null) {
            community.setDescription(request.description());
        }
        if (request.category() != null) {
            community.setCategory(parseCategory(request.category()));
        }
        if (request.tags() != null) {
            community.setTags(normalizeTags(request.tags()));
        }
        if (request.visibility() != null) {
            community.setVisibility(parseVisibility(request.visibility()));
        }
        if (nextBanner != null) {
            String previousBanner = community.getBannerImage();
            community.setBannerImage(nextBanner);
            if (previousBanner != null) {
                storageService.deleteByKey(previousBanner.replaceFirst("^/uploads/", ""));
            }
        }
        community = communities.save(community);
        return toCommunityDto(community, actorId);
    }

    public void delete(String id, String actorId) {
        Community community = requireCommunity(id);
        requireOwner(id, actorId);
        members.deleteAllByCommunityId(id);
        communities.deleteById(id);
        if (community.getBannerImage() != null) {
            storageService.deleteByKey(community.getBannerImage().replaceFirst("^/uploads/", ""));
        }
    }

    public CommunityDto join(String id, String userId) {
        Community community = requireCommunity(id);
        CommunityMember existing = members.findByCommunityIdAndUserId(id, userId).orElse(null);
        if (existing != null) {
            return toCommunityDto(community, userId, existing.getRole(), true);
        }

        CommunityMember membership = new CommunityMember();
        membership.setCommunityId(id);
        membership.setUserId(userId);
        membership.setRole(CommunityRole.MEMBER);
        members.save(membership);
        community.setMemberCount(community.getMemberCount() + 1);
        community = communities.save(community);
        return toCommunityDto(community, userId, CommunityRole.MEMBER, true);
    }

    public void leave(String id, String userId) {
        requireCommunity(id);
        CommunityMember membership = members.findByCommunityIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("You are not a member of this community", "MEMBERSHIP_NOT_FOUND"));
        if (membership.getRole() == CommunityRole.OWNER) {
            throw new BadRequestException("Owners must delete the community instead of leaving it", "OWNER_CANNOT_LEAVE");
        }
        members.deleteByCommunityIdAndUserId(id, userId);
        decrementMemberCount(id);
    }

    public List<CommunityMemberDto> membersList(String id, String actorId) {
        requireCommunity(id);
        requireMembership(id, actorId);
        return toMemberDtos(id);
    }

    public List<CommunityMemberDto> addModerator(String id, String userId, String actorId) {
        Community community = requireCommunity(id);
        requireOwner(id, actorId);
        if (Objects.equals(community.getOwner(), userId)) {
            throw new BadRequestException("The owner already has full community permissions", "OWNER_ALREADY_PRIVILEGED");
        }
        assertUserExists(userId);
        CommunityMember membership = members.findByCommunityIdAndUserId(id, userId).orElse(null);
        if (membership == null) {
            membership = new CommunityMember();
            membership.setCommunityId(id);
            membership.setUserId(userId);
            membership.setRole(CommunityRole.MODERATOR);
            members.save(membership);
            community.setMemberCount(community.getMemberCount() + 1);
            communities.save(community);
        } else {
            membership.setRole(CommunityRole.MODERATOR);
            members.save(membership);
        }
        if (!community.getModerators().contains(userId)) {
            community.getModerators().add(userId);
            communities.save(community);
        }
        return toMemberDtos(id);
    }

    public List<CommunityMemberDto> removeModerator(String id, String userId, String actorId) {
        Community community = requireCommunity(id);
        requireOwner(id, actorId);
        CommunityMember membership = members.findByCommunityIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Moderator membership not found", "MODERATOR_NOT_FOUND"));
        if (membership.getRole() != CommunityRole.MODERATOR) {
            throw new NotFoundException("Moderator membership not found", "MODERATOR_NOT_FOUND");
        }
        membership.setRole(CommunityRole.MEMBER);
        members.save(membership);
        community.getModerators().removeIf(userId::equals);
        communities.save(community);
        return toMemberDtos(id);
    }

    public List<CommunityMemberDto> removeMember(String id, String userId, String actorId) {
        requireManager(id, actorId);
        CommunityMember membership = members.findByCommunityIdAndUserId(id, userId)
                .orElseThrow(() -> new NotFoundException("Community member not found", "MEMBER_NOT_FOUND"));
        if (membership.getRole() == CommunityRole.OWNER) {
            throw new BadRequestException("The owner cannot be removed", "OWNER_CANNOT_BE_REMOVED");
        }
        members.deleteByCommunityIdAndUserId(id, userId);
        Community community = requireCommunity(id);
        community.getModerators().removeIf(userId::equals);
        communities.save(community);
        decrementMemberCount(id);
        return toMemberDtos(id);
    }

    private Community requireCommunity(String id) {
        return communities.findById(id)
                .orElseThrow(() -> new NotFoundException("Community not found", "COMMUNITY_NOT_FOUND"));
    }

    private CommunityMember requireMembership(String id, String userId) {
        return members.findByCommunityIdAndUserId(id, userId)
                .orElseThrow(() -> new ForbiddenException("Community membership is required", "MEMBERSHIP_REQUIRED"));
    }

    private void requireOwner(String id, String userId) {
        CommunityMember membership = requireMembership(id, userId);
        if (membership.getRole() != CommunityRole.OWNER) {
            throw new ForbiddenException("Only the community owner can perform this action", "OWNER_REQUIRED");
        }
    }

    private CommunityMember requireManager(String id, String userId) {
        CommunityMember membership = requireMembership(id, userId);
        if (membership.getRole() != CommunityRole.OWNER && membership.getRole() != CommunityRole.MODERATOR) {
            throw new ForbiddenException("Owner or moderator permissions are required", "MANAGER_REQUIRED");
        }
        return membership;
    }

    private void assertUserExists(String userId) {
        if (users.findById(userId).isEmpty()) {
            throw new NotFoundException("User not found", "USER_NOT_FOUND");
        }
    }

    private void assertNameAvailable(String name) {
        if (communities.findByNameIgnoreCase(name).isPresent()) {
            throw new ConflictException("A community with this name already exists", "COMMUNITY_NAME_EXISTS");
        }
    }

    private CommunityCategory parseCategory(String value) {
        try {
            return CommunityCategory.fromValue(value);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid community category", "INVALID_COMMUNITY_CATEGORY");
        }
    }

    private CommunityVisibility parseVisibility(String value) {
        if (value == null || value.isBlank()) {
            return CommunityVisibility.PUBLIC;
        }
        try {
            return CommunityVisibility.fromValue(value);
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid community visibility", "INVALID_COMMUNITY_VISIBILITY");
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
                .toList();
    }

    private String uniqueSlug(String name, String currentId) {
        String base = slugify(name);
        String slug = base;
        int suffix = 1;
        while (true) {
            Community existing = communities.findBySlugIgnoreCase(slug).orElse(null);
            if (existing == null || Objects.equals(existing.getId(), currentId)) {
                return slug;
            }
            slug = base + "-" + ++suffix;
        }
    }

    private String slugify(String value) {
        String slug = value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.isBlank()) {
            slug = "community";
        }
        return slug.substring(0, Math.min(slug.length(), 60));
    }

    private void decrementMemberCount(String id) {
        Community community = requireCommunity(id);
        community.setMemberCount(Math.max(0, community.getMemberCount() - 1));
        communities.save(community);
    }

    private CommunityDto toCommunityDto(Community community, String viewerId) {
        CommunityMember viewerMembership = members.findByCommunityIdAndUserId(community.getId(), viewerId).orElse(null);
        CommunityUserDto owner = loadOwner(community.getOwner());
        return CommunityMapper.toDto(
                community,
                owner,
                viewerMembership == null ? null : viewerMembership.getRole(),
                viewerMembership != null
        );
    }

    private CommunityDto toCommunityDto(Community community, String viewerId, CommunityRole role, boolean isMember) {
        return CommunityMapper.toDto(community, loadOwner(community.getOwner()), role, isMember);
    }

    private CommunityUserDto loadOwner(String ownerId) {
        User owner = users.findById(ownerId)
                .orElseThrow(() -> new NotFoundException("User not found", "USER_NOT_FOUND"));
        return CommunityMapper.toUserSummary(owner, false);
    }

    private Map<String, CommunityUserDto> loadUserSummaries(Set<String> ids, boolean includeStudyFields) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<String, CommunityUserDto> result = new LinkedHashMap<>();
        for (User user : users.findAllById(ids)) {
            result.put(user.getId(), CommunityMapper.toUserSummary(user, includeStudyFields));
        }
        return result;
    }

    private List<CommunityMemberDto> toMemberDtos(String communityId) {
        List<CommunityMember> allMembers = members.findAllByCommunityId(communityId).stream()
                .sorted(MEMBER_ORDER)
                .toList();
        Set<String> ids = allMembers.stream().map(CommunityMember::getUserId).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<String, CommunityUserDto> usersById = loadUserSummaries(ids, true);
        return allMembers.stream()
                .map(member -> CommunityMapper.toMemberDto(member, usersById.get(member.getUserId())))
                .toList();
    }
}
