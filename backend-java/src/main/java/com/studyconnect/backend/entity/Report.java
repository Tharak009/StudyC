package com.studyconnect.backend.entity;

import com.studyconnect.backend.entity.enums.ReportStatus;
import com.studyconnect.backend.entity.enums.ReportTargetType;
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
@Document(collection = "reports")
@CompoundIndex(name = "report_status_created", def = "{'status': 1, 'createdAt': -1}")
public class Report {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    private String id;

    @Indexed
    private String reporterId;

    @Indexed
    private ReportTargetType targetType;

    @Indexed
    private String targetId;

    private String reason;
    private String description = "";

    @Indexed
    private ReportStatus status = ReportStatus.PENDING;

    private String reviewedBy;

    private Instant reviewedAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
