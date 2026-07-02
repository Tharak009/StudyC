package com.studyconnect.backend.entity;

import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "refreshtokens")
public class RefreshToken {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed(unique = true)
    private String tokenId;

    @Indexed(unique = true)
    private String tokenHash;

    @Indexed
    private String userId;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    private Instant revokedAt;
    private String replacedByTokenId;
    private String userAgent;
    private String ipAddress;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
