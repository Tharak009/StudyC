package com.studyconnect.backend.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    public record UserPresence(
            String userId,
            Set<String> sessionIds,
            Instant lastSeen
    ) {}

    private final Map<String, UserPresence> onlineUsers = new ConcurrentHashMap<>();

    public void setOnline(String userId, String sessionId) {
        if (userId == null || sessionId == null) return;
        onlineUsers.compute(userId, (id, existing) -> {
            if (existing != null) {
                existing.sessionIds().add(sessionId);
                return new UserPresence(userId, existing.sessionIds(), Instant.now());
            } else {
                Set<String> sessions = ConcurrentHashMap.newKeySet();
                sessions.add(sessionId);
                return new UserPresence(userId, sessions, Instant.now());
            }
        });
    }

    public boolean removeSocket(String userId, String sessionId) {
        if (userId == null || sessionId == null) return false;
        UserPresence presence = onlineUsers.get(userId);
        if (presence == null) return false;

        presence.sessionIds().remove(sessionId);
        if (presence.sessionIds().isEmpty()) {
            onlineUsers.put(userId, new UserPresence(userId, presence.sessionIds(), Instant.now()));
            return true; // user is now offline across all sessions
        }
        return false; // still has other sessions open
    }

    public boolean isOnline(String userId) {
        if (userId == null) return false;
        UserPresence presence = onlineUsers.get(userId);
        return presence != null && !presence.sessionIds().isEmpty();
    }

    public Set<String> getOnlineUserIds() {
        return Collections.unmodifiableSet(onlineUsers.keySet());
    }

    public Instant getLastSeen(String userId) {
        UserPresence presence = onlineUsers.get(userId);
        return presence != null ? presence.lastSeen() : null;
    }
}
