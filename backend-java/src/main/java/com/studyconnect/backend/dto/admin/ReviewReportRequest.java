package com.studyconnect.backend.dto.admin;

import com.studyconnect.backend.entity.enums.ReportStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewReportRequest(
        @NotNull(message = "Status is required")
        ReportStatus status,

        @Size(max = 1000, message = "Description must be at most 1000 characters")
        String description) {
}
