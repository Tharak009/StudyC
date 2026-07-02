package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.chat.ChatMessageDto;
import com.studyconnect.backend.dto.chat.PaginatedChatMessagesDto;
import com.studyconnect.backend.service.ChatService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Validated
@RestController
@RequestMapping("/api/communities/{communityId}/messages")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public ApiResponse<PaginatedChatMessagesDto> history(
            @PathVariable String communityId,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "limit", defaultValue = "30") @Min(1) @Max(50) int limit,
            @RequestParam(name = "order", defaultValue = "latest") String order,
            Authentication authentication) {
        return ApiResponse.success(chatService.listMessages(communityId, SecurityUtil.currentUserId(authentication), page, limit, order), "Messages retrieved");
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ChatMessageDto>> create(
            @PathVariable String communityId,
            @RequestParam(name = "content", defaultValue = "") @Size(max = 2000) String content,
            @RequestParam(name = "replyTo", required = false) String replyTo,
            @RequestParam(name = "attachments", required = false) List<MultipartFile> attachments,
            Authentication authentication) {
        return ResponseEntity.status(201).body(ApiResponse.success(
                chatService.createMessage(communityId, SecurityUtil.currentUserId(authentication), content, replyTo, attachments),
                "Message created"));
    }

    @PutMapping("/{messageId}")
    public ApiResponse<ChatMessageDto> edit(
            @PathVariable String communityId,
            @PathVariable String messageId,
            @RequestParam(name = "content", defaultValue = "") @Size(max = 2000) String content,
            Authentication authentication) {
        return ApiResponse.success(chatService.editMessage(communityId, messageId, SecurityUtil.currentUserId(authentication), content), "Message updated");
    }

    @DeleteMapping("/{messageId}")
    public ApiResponse<ChatMessageDto> delete(
            @PathVariable String communityId,
            @PathVariable String messageId,
            Authentication authentication) {
        return ApiResponse.success(chatService.deleteMessage(communityId, messageId, SecurityUtil.currentUserId(authentication)), "Message deleted");
    }
}
