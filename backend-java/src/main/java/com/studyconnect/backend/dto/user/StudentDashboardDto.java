package com.studyconnect.backend.dto.user;

import java.util.List;

public record StudentDashboardDto(
    int profileCompletion,
    StudentStatsDto stats,
    List<ActivityDto> recentActivity
) {}
