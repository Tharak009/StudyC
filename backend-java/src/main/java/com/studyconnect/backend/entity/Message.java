package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.MessageType;
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
@Document(collection = "messages")
@CompoundIndex(name = "message_community_created", def = "{'communityId': 1, 'createdAt': -1, '_id': -1}")
public class Message {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed
    private String communityId;

    @Indexed
    private String senderId;

    private String content = "";
    private MessageType messageType = MessageType.TEXT;
    private List<MessageAttachment> attachments = new ArrayList<>();

    @Indexed
    private String replyTo;

    private boolean edited = false;
    private Instant editedAt;
    private boolean deleted = false;
    private Instant deletedAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class MessageAttachment {
        private String key;
        private String url;
        private String originalName;
        private String mimeType;
        private long size;
    }
}
