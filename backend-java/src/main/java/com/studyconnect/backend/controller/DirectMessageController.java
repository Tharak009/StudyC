package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.directmessage.EditDirectMessageRequest;
import com.studyconnect.backend.dto.directmessage.MarkAsReadRequest;
import com.studyconnect.backend.dto.directmessage.StartConversationRequest;
import com.studyconnect.backend.service.DirectMessageService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequestMapping("/api/direct-messages")
public class DirectMessageController {

    private final DirectMessageService directMessageService;

    public DirectMessageController(DirectMessageService directMessageService) {
        this.directMessageService = directMessageService;
    }

    @PostMapping("/conversations")
    public ResponseEntity<ApiResponse<?>> startConversation(@Valid @RequestBody StartConversationRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                directMessageService.startConversation(SecurityUtil.currentUserId(authentication), request.receiverId()),
                "Conversation started"
        ));
    }

    @GetMapping("/conversations")
    public ApiResponse<?> listConversations(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        return ApiResponse.success(
                directMessageService.listConversations(SecurityUtil.currentUserId(authentication), page, limit, search),
                "Conversations retrieved"
        );
    }

    @GetMapping("/conversations/{conversationId}")
    public ApiResponse<?> getConversation(@PathVariable String conversationId, Authentication authentication) {
        return ApiResponse.success(
                directMessageService.getConversation(conversationId, SecurityUtil.currentUserId(authentication)),
                "Conversation retrieved"
        );
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ApiResponse<?> getMessages(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int limit,
            @RequestParam(defaultValue = "latest") String order,
            @RequestParam(required = false) String search,
            Authentication authentication) {
        return ApiResponse.success(
                directMessageService.getMessages(conversationId, SecurityUtil.currentUserId(authentication), page, limit, order, search),
                "Messages retrieved"
        );
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<?>> sendMessage(
            @PathVariable String conversationId,
            @RequestParam(required = false, defaultValue = "") String content,
            @RequestParam(required = false) String replyTo,
            @RequestParam(name = "attachments", required = false) List<MultipartFile> attachments,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                directMessageService.sendMessage(
                        conversationId,
                        SecurityUtil.currentUserId(authentication),
                        content,
                        replyTo,
                        attachments
                ),
                "Message sent"
        ));
    }

    @PutMapping("/messages/{messageId}")
    public ApiResponse<?> editMessage(
            @PathVariable String messageId,
            @Valid @RequestBody EditDirectMessageRequest request,
            Authentication authentication) {
        return ApiResponse.success(
                directMessageService.editMessage(messageId, SecurityUtil.currentUserId(authentication), request.content()),
                "Message edited"
        );
    }

    @DeleteMapping("/messages/{messageId}")
    public ApiResponse<?> deleteMessage(@PathVariable String messageId, Authentication authentication) {
        return ApiResponse.success(
                directMessageService.deleteMessage(messageId, SecurityUtil.currentUserId(authentication)),
                "Message deleted"
        );
    }

    @PostMapping("/messages/read")
    public ApiResponse<?> markAsRead(@Valid @RequestBody MarkAsReadRequest request, Authentication authentication) {
        directMessageService.markAsRead(request.conversationId(), SecurityUtil.currentUserId(authentication));
        return ApiResponse.success(null, "Messages marked as read");
    }

    @GetMapping("/conversations/unread")
    public ApiResponse<?> unreadCount(Authentication authentication) {
        return ApiResponse.success(
                java.util.Map.of("count", directMessageService.unreadCount(SecurityUtil.currentUserId(authentication))),
                "Unread count retrieved"
        );
    }
}
