package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.CommunityCategory;
import com.studyconnect.backend.entity.enums.CommunityVisibility;
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
@Document(collection = "communities")
@CompoundIndex(name = "community_category_visibility_created", def = "{'category': 1, 'visibility': 1, 'createdAt': -1}")
public class Community {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed(unique = true)
    private String name;

    @Indexed(unique = true)
    private String slug;

    private String description = "";
    private String bannerImage;

    @Indexed
    private CommunityCategory category;

    private List<String> tags = new ArrayList<>();

    @Indexed
    private CommunityVisibility visibility = CommunityVisibility.PUBLIC;

    @Indexed
    private String owner;

    private List<String> moderators = new ArrayList<>();
    private long memberCount = 0;
    private ExtensionPoints extensionPoints = new ExtensionPoints();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ExtensionPoints {
        private boolean chatEnabled;
        private boolean resourcesEnabled;
        private boolean notificationsEnabled;
    }
}
