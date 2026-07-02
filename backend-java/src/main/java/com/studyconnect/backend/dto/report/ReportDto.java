package com.studyconnect.backend.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.ReportStatus;
import com.studyconnect.backend.entity.enums.ReportTargetType;
import java.time.Instant;

public record ReportDto(
        @JsonProperty("_id") String id,
        ReportUserSummaryDto reporterId,
        ReportTargetType targetType,
        String targetId,
        String reason,
        String description,
        ReportStatus status,
        ReviewedBySummaryDto reviewedBy,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt) {
}
