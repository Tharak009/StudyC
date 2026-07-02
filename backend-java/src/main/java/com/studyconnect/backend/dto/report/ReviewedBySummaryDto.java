package com.studyconnect.backend.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ReviewedBySummaryDto(
        @JsonProperty("_id") String id,
        String fullName,
        String rollNumber) {
}
