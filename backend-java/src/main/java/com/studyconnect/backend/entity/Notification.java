package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.EntityType;
import com.studyconnect.backend.entity.enums.NotificationType;
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
@Document(collection = "notifications")
@CompoundIndex(name = "notification_user_unread_created", def = "{'userId': 1, 'isRead': 1, 'createdAt': -1}")
public class Notification {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private NotificationType type;

    private String title;
    private String message;
    private EntityType entityType;

    private String entityId;

    @Indexed
    private boolean isRead = false;
    private Instant readAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
