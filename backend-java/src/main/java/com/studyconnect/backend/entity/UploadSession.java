package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "upload_sessions")
public class UploadSession {

    @Id
    private String id;

    private String s3Key;
    private String uploadId;
    private String communityId;
    private String userId;
    private String fileName;
    private long fileSize;
    private String mimeType;
    private int totalParts;

    private String title;
    private String description;
    private ResourceCategory category;
    private ResourceVisibility visibility;
    private List<String> tags = new ArrayList<>();

    private List<PartInfo> completedParts = new ArrayList<>();
    private SessionStatus status = SessionStatus.INITIATED;

    private Instant createdAt = Instant.now();

    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt = Instant.now().plusSeconds(86400); // 24h TTL

    public enum SessionStatus {
        INITIATED,
        IN_PROGRESS,
        COMPLETED,
        ABORTED
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class PartInfo {
        private int partNumber;
        private String etag;

        public PartInfo(int partNumber, String etag) {
            this.partNumber = partNumber;
            this.etag = etag;
        }
    }
}
