package com.studyconnect.backend.mapper;

import com.studyconnect.backend.dto.report.ReportDto;
import com.studyconnect.backend.dto.report.ReportUserSummaryDto;
import com.studyconnect.backend.dto.report.ReviewedBySummaryDto;
import com.studyconnect.backend.entity.Report;
import com.studyconnect.backend.entity.User;

public final class ReportMapper {

    private ReportMapper() {
    }

    public static ReportDto toDto(Report report, User reporter, User reviewedBy) {
        return new ReportDto(
                report.getId(),
                reporter == null ? null : new ReportUserSummaryDto(
                        reporter.getId(),
                        reporter.getFullName(),
                        reporter.getRollNumber(),
                        reporter.getEmail(),
                        reporter.getProfilePicture()
                ),
                report.getTargetType(),
                report.getTargetId(),
                report.getReason(),
                report.getDescription(),
                report.getStatus(),
                reviewedBy == null ? null : new ReviewedBySummaryDto(reviewedBy.getId(), reviewedBy.getFullName(), reviewedBy.getRollNumber()),
                report.getReviewedAt(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }
}
