package com.studyconnect.backend.dto.admin;

import java.util.List;
import java.util.Map;

public record AdminDashboardStatsDto(
        long userCount,
        long communityCount,
        long resourceCount,
        long reportCount,
        long activeUsers,
        List<Map<String, Object>> recentActivity) {
}
