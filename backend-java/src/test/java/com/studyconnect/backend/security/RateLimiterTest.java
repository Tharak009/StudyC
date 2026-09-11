package com.studyconnect.backend.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimiterTest {

    @Test
    void testRateLimiterThreshold() {
        RateLimiter limiter = new RateLimiter(1000L, 2);

        assertFalse(limiter.isRateLimited("userA"));
        assertFalse(limiter.isRateLimited("userA"));
        assertTrue(limiter.isRateLimited("userA")); // 3rd request in 1s window is limited
    }
}
