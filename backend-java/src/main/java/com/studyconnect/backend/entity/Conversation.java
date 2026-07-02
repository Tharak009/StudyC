package com.studyconnect.backend.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
@Document(collection = "conversations")
public class Conversation {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    private List<String> participants = new ArrayList<>();
    private LastMessage lastMessage;

    @Indexed
    private Instant lastMessageAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class LastMessage {
        private String content;
        private String senderId;
        private Instant createdAt;
    }
}
