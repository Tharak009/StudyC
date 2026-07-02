package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.resource.PaginatedResourcesDto;
import com.studyconnect.backend.dto.resource.ResourceCommunityDto;
import com.studyconnect.backend.dto.resource.ResourceDto;
import com.studyconnect.backend.dto.resource.ResourceUploaderDto;
import com.studyconnect.backend.entity.Community;
import com.studyconnect.backend.entity.Resource;
import com.studyconnect.backend.entity.User;
import java.util.List;

public final class ResourceMapper {

    private ResourceMapper() {
    }

    public static ResourceDto toDto(Resource resource, User uploader, Community community) {
        return new ResourceDto(
                resource.getId(),
                resource.getTitle(),
                resource.getDescription(),
                resource.getFileName(),
                resource.getFileUrl(),
                resource.getFileSize(),
                resource.getFileType(),
                resource.getCategory(),
                resource.getTags() == null ? List.of() : List.copyOf(resource.getTags()),
                new ResourceUploaderDto(
                        uploader.getId(),
                        uploader.getFullName(),
                        uploader.getRollNumber(),
                        uploader.getProfilePicture()
                ),
                new ResourceCommunityDto(
                        community.getId(),
                        community.getName(),
                        community.getSlug()
                ),
                resource.getDownloadCount(),
                resource.getVisibility(),
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }

    public static PaginatedResourcesDto toPage(List<ResourceDto> items, long total, int page, int limit) {
        int pages = (int) Math.ceil((double) total / limit);
        if (pages == 0) {
            pages = 1;
        }
        return new PaginatedResourcesDto(items, total, page, limit, pages);
    }
}
