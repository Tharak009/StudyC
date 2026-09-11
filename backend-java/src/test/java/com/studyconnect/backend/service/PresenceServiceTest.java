package com.studyconnect.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class PresenceServiceTest {

    private PresenceService presenceService;

    @BeforeEach
    void setUp() {
        presenceService = new PresenceService();
    }

    @Test
    void testSetOnlineAndIsOnline() {
        presenceService.setOnline("user123", "session-1");
        assertTrue(presenceService.isOnline("user123"));
        assertTrue(presenceService.getOnlineUserIds().contains("user123"));
    }

    @Test
    void testMultipleSessions() {
        presenceService.setOnline("user123", "session-1");
        presenceService.setOnline("user123", "session-2");

        boolean offlineNow = presenceService.removeSocket("user123", "session-1");
        assertFalse(offlineNow);
        assertTrue(presenceService.isOnline("user123"));

        boolean fullyOffline = presenceService.removeSocket("user123", "session-2");
        assertTrue(fullyOffline);
        assertFalse(presenceService.isOnline("user123"));
    }

    @Test
    void testGetLastSeen() {
        presenceService.setOnline("user123", "session-1");
        Instant lastSeen = presenceService.getLastSeen("user123");
        assertNotNull(lastSeen);
    }
}
