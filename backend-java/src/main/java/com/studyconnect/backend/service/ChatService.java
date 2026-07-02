package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.chat.ChatMessageDto;
import com.studyconnect.backend.dto.chat.PaginatedChatMessagesDto;
import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.Message;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.MessageType;
import com.studyconnect.backend.exception.BadRequestException;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.exception.UnprocessableEntityException;
import com.studyconnect.backend.mapper.ChatMapper;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.MessageRepository;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.websocket.RealtimeTopics;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ChatService {

    private static final Set<String> ATTACHMENT_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
    );
    private static final long MAX_ATTACHMENT_BYTES = 5L * 1024 * 1024;

    private final MessageRepository messages;
    private final CommunityMemberRepository members;
    private final UserRepository users;
    private final FileStorageService storageService;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(
            MessageRepository messages,
            CommunityMemberRepository members,
            UserRepository users,
            FileStorageService storageService,
            MongoTemplate mongoTemplate,
            SimpMessagingTemplate messagingTemplate) {
        this.messages = messages;
        this.members = members;
        this.users = users;
        this.storageService = storageService;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    public PaginatedChatMessagesDto listMessages(String communityId, String userId, int page, int limit, String order) {
        requireMembership(communityId, userId);
        String normalizedOrder = normalizeOrder(order);
        int direction = "oldest".equals(normalizedOrder) ? 1 : -1;

        Criteria filter = Criteria.where("communityId").is(communityId).and("deleted").ne(true);
        Query query = new Query(filter);
        query.with(Sort.by(
                direction < 0 ? Sort.Order.desc("createdAt") : Sort.Order.asc("createdAt"),
                direction < 0 ? Sort.Order.desc("_id") : Sort.Order.asc("_id")));
        query.skip((long) (page - 1) * limit);
        query.limit(limit);

        List<Message> items = mongoTemplate.find(query, Message.class);
        long total = mongoTemplate.count(new Query(filter), Message.class);
        int pages = (int) Math.ceil((double) total / limit);
        if (pages == 0) {
            pages = 1;
        }
        List<ChatMessageDto> dtos = items.stream().map(this::toDto).toList();
        return new PaginatedChatMessagesDto(dtos, total, page, limit, pages, normalizedOrder);
    }

    public ChatMessageDto createMessage(
            String communityId,
            String userId,
            String content,
            String replyTo,
            List<MultipartFile> attachments) {
        requireMembership(communityId, userId);
        String normalizedContent = content == null ? "" : content.trim();
        List<MultipartFile> files = attachments == null ? List.of() : attachments.stream().filter(file -> file != null && !file.isEmpty()).toList();
        if (normalizedContent.isBlank() && files.isEmpty()) {
            throw new UnprocessableEntityException("Message content or attachment is required", "MESSAGE_EMPTY");
        }
        if (files.size() > 5) {
            throw new BadRequestException("A maximum of 5 attachments is allowed", "ATTACHMENT_LIMIT_EXCEEDED");
        }

        List<Message.MessageAttachment> storedAttachments = new ArrayList<>();
        for (MultipartFile file : files) {
            storedAttachments.add(storeAttachment(file));
        }

        Message message = new Message();
        message.setCommunityId(communityId);
        message.setSenderId(userId);
        message.setContent(normalizedContent);
        message.setMessageType(messageTypeFor(storedAttachments));
        message.setAttachments(storedAttachments);
        message.setReplyTo(replyTo == null || replyTo.isBlank() ? null : replyTo.trim());
        message.setEdited(false);
        message.setDeleted(false);
        Message created = messages.save(message);
        ChatMessageDto dto = toDto(created);
        messagingTemplate.convertAndSend(RealtimeTopics.communityMessageCreated(communityId), dto);
        return dto;
    }

    public ChatMessageDto editMessage(String communityId, String messageId, String userId, String content) {
        requireMembership(communityId, userId);
        Message message = messages.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found", "MESSAGE_NOT_FOUND"));
        if (!communityId.equals(message.getCommunityId()) || message.isDeleted()) {
            throw new NotFoundException("Message not found", "MESSAGE_NOT_FOUND");
        }
        if (!userId.equals(message.getSenderId())) {
            throw new ForbiddenException("Only the sender can edit this message", "MESSAGE_EDIT_FORBIDDEN");
        }
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isBlank()) {
            throw new UnprocessableEntityException("Message content is required", "MESSAGE_EMPTY");
        }
        message.setContent(normalizedContent);
        message.setEdited(true);
        message.setEditedAt(Instant.now());
        Message saved = messages.save(message);
        ChatMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.communityMessageUpdated(communityId), dto);
        return dto;
    }

    public ChatMessageDto deleteMessage(String communityId, String messageId, String userId) {
        CommunityMember membership = requireMembership(communityId, userId);
        Message message = messages.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found", "MESSAGE_NOT_FOUND"));
        if (!communityId.equals(message.getCommunityId()) || message.isDeleted()) {
            throw new NotFoundException("Message not found", "MESSAGE_NOT_FOUND");
        }
        boolean isSender = userId.equals(message.getSenderId());
        boolean canModerate = membership.getRole() == CommunityRole.OWNER || membership.getRole() == CommunityRole.MODERATOR;
        if (!isSender && !canModerate) {
            throw new ForbiddenException("Only the sender or community moderators can delete this message", "MESSAGE_DELETE_FORBIDDEN");
        }
        message.setContent("");
        message.setAttachments(new ArrayList<>());
        message.setDeleted(true);
        message.setDeletedAt(Instant.now());
        message.setEdited(false);
        message.setEditedAt(null);
        Message saved = messages.save(message);
        ChatMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.communityMessageDeleted(communityId), dto);
        return dto;
    }

    public CommunityMember requireMembership(String communityId, String userId) {
        return members.findByCommunityIdAndUserId(communityId, userId)
                .orElseThrow(() -> new ForbiddenException("Community membership is required for chat", "CHAT_MEMBERSHIP_REQUIRED"));
    }

    private Message.MessageAttachment storeAttachment(MultipartFile file) {
        FileStorageService.StoredFile stored = storageService.store(file, "chat", ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES);
        Message.MessageAttachment attachment = new Message.MessageAttachment();
        attachment.setKey(stored.key());
        attachment.setUrl(stored.url());
        attachment.setOriginalName(stored.originalName());
        attachment.setMimeType(stored.mimeType());
        attachment.setSize(stored.size());
        return attachment;
    }

    private MessageType messageTypeFor(List<Message.MessageAttachment> attachments) {
        if (attachments.isEmpty()) {
            return MessageType.TEXT;
        }
        String mimeType = attachments.get(0).getMimeType();
        if (mimeType.startsWith("image/")) {
            return MessageType.IMAGE;
        }
        if ("application/pdf".equals(mimeType)) {
            return MessageType.PDF;
        }
        return MessageType.DOCUMENT;
    }

    private ChatMessageDto toDto(Message message) {
        User sender = users.findById(message.getSenderId())
                .orElseThrow(() -> new NotFoundException("User not found", "USER_NOT_FOUND"));
        Message reply = null;
        User replySender = null;
        if (message.getReplyTo() != null && !message.getReplyTo().isBlank()) {
            reply = messages.findById(message.getReplyTo()).orElse(null);
            if (reply != null && reply.getSenderId() != null) {
                replySender = users.findById(reply.getSenderId()).orElse(null);
            }
        }
        return ChatMapper.toDto(message, sender, reply, replySender);
    }

    private String normalizeOrder(String order) {
        if (order == null) {
            return "latest";
        }
        String normalized = order.trim().toLowerCase(Locale.ROOT);
        return "oldest".equals(normalized) ? "oldest" : "latest";
    }
}
