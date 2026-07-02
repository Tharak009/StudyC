package com.studyconnect.backend.dto.user;

public record StudentStatsDto(
    long communitiesJoined,
    long upcomingEvents,
    long unreadMessages,
    long unreadNotifications,
    long projectsShared
) {}
