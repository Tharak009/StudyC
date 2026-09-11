package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.chat.ChatMessageDto;
import com.studyconnect.backend.service.ChatService;
import com.studyconnect.backend.websocket.RealtimeTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public record RoomRequest(String communityId) {}
    public record SendMessageRequest(String communityId, String content, String replyTo) {}
    public record EditMessageRequest(String communityId, String messageId, String content) {}
    public record DeleteMessageRequest(String communityId, String messageId) {}
    public record TypingRequest(String communityId, String conversationId) {}

    @MessageMapping("/community.join")
    public void joinCommunity(@Payload RoomRequest request, Principal principal) {
        if (principal == null || request.communityId() == null) return;
        String userId = principal.getName();
        chatService.requireMembership(request.communityId(), userId);
        log.info("User {} joined room for community {}", userId, request.communityId());
        messagingTemplate.convertAndSend(
                RealtimeTopics.communityMessageCreated(request.communityId()),
                Map.of("type", "userJoined", "communityId", request.communityId(), "userId", userId)
        );
    }

    @MessageMapping("/community.leave")
    public void leaveCommunity(@Payload RoomRequest request, Principal principal) {
        if (principal == null || request.communityId() == null) return;
        String userId = principal.getName();
        log.info("User {} left room for community {}", userId, request.communityId());
        messagingTemplate.convertAndSend(
                RealtimeTopics.communityMessageCreated(request.communityId()),
                Map.of("type", "userLeft", "communityId", request.communityId(), "userId", userId)
        );
    }

    @MessageMapping("/community.sendMessage")
    public void sendMessage(@Payload SendMessageRequest request, Principal principal) {
        if (principal == null) return;
        ChatMessageDto created = chatService.createMessage(
                request.communityId(),
                principal.getName(),
                request.content(),
                request.replyTo(),
                null
        );
        log.info("Message sent in community {} by user {}", request.communityId(), principal.getName());
    }

    @MessageMapping("/community.editMessage")
    public void editMessage(@Payload EditMessageRequest request, Principal principal) {
        if (principal == null) return;
        chatService.editMessage(request.communityId(), request.messageId(), principal.getName(), request.content());
    }

    @MessageMapping("/community.deleteMessage")
    public void deleteMessage(@Payload DeleteMessageRequest request, Principal principal) {
        if (principal == null) return;
        chatService.deleteMessage(request.communityId(), request.messageId(), principal.getName());
    }

    @MessageMapping("/typing.start")
    public void typingStart(@Payload TypingRequest request, Principal principal) {
        if (principal == null) return;
        String userId = principal.getName();
        if (request.communityId() != null) {
            messagingTemplate.convertAndSend(
                    RealtimeTopics.communityMessageCreated(request.communityId()),
                    Map.of("type", "userTyping", "communityId", request.communityId(), "userId", userId)
            );
        } else if (request.conversationId() != null) {
            messagingTemplate.convertAndSend(
                    RealtimeTopics.directMessageTyping(request.conversationId()),
                    Map.of("conversationId", request.conversationId(), "userId", userId)
            );
        }
    }

    @MessageMapping("/typing.stop")
    public void typingStop(@Payload TypingRequest request, Principal principal) {
        if (principal == null) return;
        String userId = principal.getName();
        if (request.communityId() != null) {
            messagingTemplate.convertAndSend(
                    RealtimeTopics.communityMessageCreated(request.communityId()),
                    Map.of("type", "userStoppedTyping", "communityId", request.communityId(), "userId", userId)
            );
        } else if (request.conversationId() != null) {
            messagingTemplate.convertAndSend(
                    RealtimeTopics.directMessageStoppedTyping(request.conversationId()),
                    Map.of("conversationId", request.conversationId(), "userId", userId)
            );
        }
    }
}
