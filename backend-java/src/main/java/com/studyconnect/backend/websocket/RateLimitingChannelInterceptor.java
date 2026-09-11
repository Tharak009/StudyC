package com.studyconnect.backend.websocket;

import com.studyconnect.backend.security.RateLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Slf4j
@Component
public class RateLimitingChannelInterceptor implements ChannelInterceptor {

    private final RateLimiter socketRateLimiter = new RateLimiter(1000L, 10); // 10 events per second

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.SEND.equals(accessor.getCommand())) {
            Principal user = accessor.getUser();
            String key = user != null ? user.getName() : accessor.getSessionId();
            if (key != null && socketRateLimiter.isRateLimited(key)) {
                log.warn("STOMP rate limit exceeded for user/session: {}", key);
                throw new IllegalStateException("Rate limit exceeded. Please slow down.");
            }
        }
        return message;
    }
}
