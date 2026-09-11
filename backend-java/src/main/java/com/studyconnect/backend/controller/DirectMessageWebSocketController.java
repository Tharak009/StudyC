package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.directmessage.DirectMessageDto;
import com.studyconnect.backend.service.DirectMessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class DirectMessageWebSocketController {

    private final DirectMessageService directMessageService;

    public record SendDirectMessageRequest(String conversationId, String content, String replyTo) {}
    public record EditDirectMessageRequest(String id, String content) {}
    public record DeleteDirectMessageRequest(String id) {}
    public record MarkAsReadRequest(String conversationId) {}

    @MessageMapping("/dm.send")
    public void sendDirectMessage(@Payload SendDirectMessageRequest request, Principal principal) {
        if (principal == null) return;
        DirectMessageDto response = directMessageService.sendMessage(
                request.conversationId(),
                principal.getName(),
                request.content(),
                request.replyTo(),
                null
        );
        log.info("Direct message sent in conversation {} by user {}", request.conversationId(), principal.getName());
    }

    @MessageMapping("/dm.edit")
    public void editDirectMessage(@Payload EditDirectMessageRequest request, Principal principal) {
        if (principal == null) return;
        directMessageService.editMessage(request.id(), principal.getName(), request.content());
    }

    @MessageMapping("/dm.delete")
    public void deleteDirectMessage(@Payload DeleteDirectMessageRequest request, Principal principal) {
        if (principal == null) return;
        directMessageService.deleteMessage(request.id(), principal.getName());
    }

    @MessageMapping("/dm.read")
    public void markAsRead(@Payload MarkAsReadRequest request, Principal principal) {
        if (principal == null) return;
        directMessageService.markAsRead(request.conversationId(), principal.getName());
    }
}
