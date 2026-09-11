package com.studyconnect.backend.websocket;

import com.studyconnect.backend.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();

        if (principal != null && sessionId != null) {
            String userId = principal.getName();
            presenceService.setOnline(userId, sessionId);
            log.info("User connected to STOMP WebSocket: userId={}, sessionId={}", userId, sessionId);

            messagingTemplate.convertAndSend(
                    "/topic/presence/online",
                    Map.of("userId", userId)
            );
        }
    }

    @EventListener
    public void handleSessionDisconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();

        if (principal != null && sessionId != null) {
            String userId = principal.getName();
            boolean isNowOffline = presenceService.removeSocket(userId, sessionId);
            log.info("User disconnected from STOMP WebSocket: userId={}, sessionId={}, completelyOffline={}", userId, sessionId, isNowOffline);

            if (isNowOffline) {
                Instant lastSeen = presenceService.getLastSeen(userId);
                messagingTemplate.convertAndSend(
                        "/topic/presence/offline",
                        Map.of(
                                "userId", userId,
                                "lastSeen", lastSeen != null ? lastSeen.toString() : Instant.now().toString()
                        )
                );
            }
        }
    }
}
