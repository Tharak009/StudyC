package com.studyconnect.backend.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ReportUserSummaryDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber,
        String email,
        String profilePicture) {
}
