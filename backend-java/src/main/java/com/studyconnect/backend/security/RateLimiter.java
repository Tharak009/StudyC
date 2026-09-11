package com.studyconnect.backend.security;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimiter {

    private record LimitEntry(int count, long resetAt) {}

    private final long windowMs;
    private final int maxRequests;
    private final Map<String, LimitEntry> keyLimits = new ConcurrentHashMap<>();

    public RateLimiter(long windowMs, int maxRequests) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    public boolean isRateLimited(String key) {
        if (key == null) return false;
        long now = System.currentTimeMillis();

        LimitEntry entry = keyLimits.get(key);
        if (entry == null || now >= entry.resetAt()) {
            keyLimits.put(key, new LimitEntry(1, now + windowMs));
            return false;
        }

        if (entry.count() >= maxRequests) {
            return true;
        }

        keyLimits.put(key, new LimitEntry(entry.count() + 1, entry.resetAt()));
        return false;
    }

    public void cleanup() {
        long now = System.currentTimeMillis();
        keyLimits.entrySet().removeIf(e -> now >= e.getValue().resetAt());
    }
}
