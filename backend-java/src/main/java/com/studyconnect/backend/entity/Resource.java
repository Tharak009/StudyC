package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "resources")
@CompoundIndex(name = "resource_category_community_created", def = "{'category': 1, 'communityId': 1, 'createdAt': -1}")
public class Resource {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    private String title;
    private String description = "";
    private String fileName;
    private String fileUrl;
    private long fileSize;
    private String fileType;

    @Indexed
    private ResourceCategory category;
    private List<String> tags = new ArrayList<>();

    @Indexed
    private String uploadedBy;

    @Indexed
    private String communityId;

    private long downloadCount = 0;
    private ResourceVisibility visibility = ResourceVisibility.COMMUNITY;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
