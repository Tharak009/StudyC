package com.studyconnect.backend.dto.admin;

import com.studyconnect.backend.dto.report.ReportDto;
import java.util.List;

public record PaginatedReportsDto(
        List<ReportDto> items,
        long total,
        int page,
        int limit,
        int pages) {
}
