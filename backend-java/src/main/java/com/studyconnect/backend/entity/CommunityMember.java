package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.CommunityRole;
import java.time.Instant;
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
@Document(collection = "communitymembers")
@CompoundIndex(name = "community_member_unique", def = "{'communityId': 1, 'userId': 1}", unique = true)
public class CommunityMember {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed
    private String communityId;

    @Indexed
    private String userId;

    private CommunityRole role = CommunityRole.MEMBER;

    @CreatedDate
    private Instant joinedAt;

    @LastModifiedDate
    private Instant updatedAt;
}
