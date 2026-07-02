package com.studyconnect.backend.service;

import com.studyconnect.backend.dto.directmessage.ConversationDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageDto;
import com.studyconnect.backend.dto.directmessage.PaginatedConversationsDto;
import com.studyconnect.backend.dto.directmessage.PaginatedDirectMessagesDto;
import com.studyconnect.backend.entity.Conversation;
import com.studyconnect.backend.entity.DirectMessage;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.MessageType;
import com.studyconnect.backend.exception.BadRequestException;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.exception.UnprocessableEntityException;
import com.studyconnect.backend.mapper.DirectMessageMapper;
import com.studyconnect.backend.repository.ConversationRepository;
import com.studyconnect.backend.repository.DirectMessageRepository;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.websocket.RealtimeTopics;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DirectMessageService {

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

    private final ConversationRepository conversations;
    private final DirectMessageRepository messages;
    private final UserRepository users;
    private final FileStorageService storageService;
    private final MongoTemplate mongoTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    public DirectMessageService(
            ConversationRepository conversations,
            DirectMessageRepository messages,
            UserRepository users,
            FileStorageService storageService,
            MongoTemplate mongoTemplate,
            SimpMessagingTemplate messagingTemplate) {
        this.conversations = conversations;
        this.messages = messages;
        this.users = users;
        this.storageService = storageService;
        this.mongoTemplate = mongoTemplate;
        this.messagingTemplate = messagingTemplate;
    }

    public ConversationDto startConversation(String userId, String receiverId) {
        if (Objects.equals(userId, receiverId)) {
            throw new UnprocessableEntityException("Cannot start conversation with yourself", "SELF_CONVERSATION");
        }
        requireUser(receiverId);

        Conversation existing = findExistingConversation(userId, receiverId);
        if (existing != null) {
            return hydrateConversation(existing);
        }

        Conversation conversation = new Conversation();
        conversation.setParticipants(new ArrayList<>(List.of(userId, receiverId)));
        conversation.setLastMessage(null);
        conversation.setLastMessageAt(null);
        Conversation saved = conversations.save(conversation);
        ConversationDto dto = hydrateConversation(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.directMessageConversationCreated(), dto);
        return dto;
    }

    public ConversationDto getConversation(String conversationId, String userId) {
        Conversation conversation = requireConversation(conversationId);
        requireParticipant(conversation, userId);
        return hydrateConversation(conversation);
    }

    public PaginatedConversationsDto listConversations(String userId, int page, int limit, String search) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        Query query = buildConversationQuery(userId, search);
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(Sort.Order.desc("lastMessageAt"), Sort.Order.desc("_id")));

        List<Conversation> items = mongoTemplate.find(query, Conversation.class);
        long total = mongoTemplate.count(buildConversationQuery(userId, search), Conversation.class);
        List<ConversationDto> dtos = hydrateConversations(items);
        int pages = (int) Math.ceil((double) total / safeLimit);
        if (pages == 0) {
            pages = 1;
        }
        return new PaginatedConversationsDto(dtos, total, safePage, safeLimit, pages);
    }

    public PaginatedDirectMessagesDto getMessages(String conversationId, String userId, int page, int limit, String order, String search) {
        Conversation conversation = requireConversation(conversationId);
        requireParticipant(conversation, userId);

        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        String safeOrder = "oldest".equalsIgnoreCase(order) ? "oldest" : "latest";
        Sort.Direction direction = "oldest".equals(safeOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;

        Query query = new Query();
        query.addCriteria(Criteria.where("conversationId").is(conversationId).and("deleted").ne(true));
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(Criteria.where("content").regex(pattern));
        }
        query.with(PageRequest.of(safePage - 1, safeLimit));
        query.with(Sort.by(new Sort.Order(direction, "createdAt"), new Sort.Order(direction, "_id")));

        List<DirectMessage> items = mongoTemplate.find(query, DirectMessage.class);
        long total = mongoTemplate.count(buildMessageCountQuery(conversationId, search), DirectMessage.class);
        List<DirectMessageDto> dtos = items.stream().map(this::hydrateMessage).toList();
        int pages = (int) Math.ceil((double) total / safeLimit);
        if (pages == 0) {
            pages = 1;
        }
        return new PaginatedDirectMessagesDto(dtos, total, safePage, safeLimit, pages, safeOrder);
    }

    public DirectMessageDto sendMessage(
            String conversationId,
            String userId,
            String content,
            String replyTo,
            List<MultipartFile> attachments) {
        Conversation conversation = requireConversation(conversationId);
        requireParticipant(conversation, userId);

        String normalizedContent = content == null ? "" : content.trim();
        List<MultipartFile> safeAttachments = attachments == null ? List.of() : attachments.stream().filter(Objects::nonNull).toList();
        if (safeAttachments.size() > 5) {
            throw new BadRequestException("A maximum of 5 attachments is allowed", "TOO_MANY_ATTACHMENTS");
        }
        if (normalizedContent.isBlank() && safeAttachments.isEmpty()) {
            throw new UnprocessableEntityException("Message content or attachment is required", "MESSAGE_EMPTY");
        }

        List<DirectMessage.DirectMessageAttachment> storedAttachments = safeAttachments.stream()
                .map(file -> storeAttachment(file))
                .toList();

        DirectMessage message = new DirectMessage();
        message.setConversationId(conversationId);
        message.setSenderId(userId);
        message.setContent(normalizedContent);
        message.setMessageType(messageTypeFor(storedAttachments));
        message.setAttachments(new ArrayList<>(storedAttachments));
        message.setReplyTo(replyTo == null || replyTo.isBlank() ? null : replyTo.trim());
        message.setEdited(false);
        message.setDeleted(false);
        DirectMessage saved = messages.save(message);

        Conversation.LastMessage lastMessage = new Conversation.LastMessage();
        lastMessage.setContent(normalizedContent.isBlank() ? "Sent " + storedAttachments.size() + " file(s)" : normalizedContent);
        lastMessage.setSenderId(userId);
        Instant now = Instant.now();
        lastMessage.setCreatedAt(now);
        conversation.setLastMessage(lastMessage);
        conversation.setLastMessageAt(now);
        conversations.save(conversation);

        DirectMessageDto dto = hydrateMessage(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.directMessageCreated(conversationId), dto);
        return dto;
    }

    public DirectMessageDto editMessage(String messageId, String userId, String content) {
        DirectMessage message = requireMessage(messageId);
        if (message.isDeleted()) {
            throw new NotFoundException("Message not found", "MESSAGE_NOT_FOUND");
        }
        if (!Objects.equals(message.getSenderId(), userId)) {
            throw new ForbiddenException("Only the sender can edit this message", "MESSAGE_EDIT_FORBIDDEN");
        }
        String normalized = content == null ? "" : content.trim();
        if (normalized.isBlank()) {
            throw new UnprocessableEntityException("Content is required", "MESSAGE_EMPTY");
        }

        message.setContent(normalized);
        message.setEdited(true);
        message.setEditedAt(Instant.now());
        DirectMessage saved = messages.save(message);
        DirectMessageDto dto = hydrateMessage(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.directMessageUpdated(saved.getConversationId()), dto);
        return dto;
    }

    public DirectMessageDto deleteMessage(String messageId, String userId) {
        DirectMessage message = requireMessage(messageId);
        if (message.isDeleted()) {
            throw new NotFoundException("Message not found", "MESSAGE_NOT_FOUND");
        }
        if (!Objects.equals(message.getSenderId(), userId)) {
            throw new ForbiddenException("Only the sender can delete this message", "MESSAGE_DELETE_FORBIDDEN");
        }

        message.setContent("");
        message.setAttachments(new ArrayList<>());
        message.setDeleted(true);
        message.setDeletedAt(Instant.now());
        message.setEdited(false);
        message.setEditedAt(null);
        DirectMessage saved = messages.save(message);
        DirectMessageDto dto = hydrateMessage(saved);
        messagingTemplate.convertAndSend(RealtimeTopics.directMessageDeleted(saved.getConversationId()), dto);
        return dto;
    }

    public void markAsRead(String conversationId, String userId) {
        Conversation conversation = requireConversation(conversationId);
        requireParticipant(conversation, userId);

        Instant readAt = Instant.now();
        Query query = new Query();
        query.addCriteria(Criteria.where("conversationId").is(conversationId)
                .and("senderId").ne(userId)
                .and("read").is(false)
                .and("deleted").ne(true));
        var update = new org.springframework.data.mongodb.core.query.Update()
                .set("read", true)
                .set("readAt", readAt);
        mongoTemplate.updateMulti(query, update, DirectMessage.class);
        messagingTemplate.convertAndSend(RealtimeTopics.directMessageRead(conversationId), Map.of(
                "conversationId", conversationId,
                "readAt", readAt
        ));
    }

    public long unreadCount(String userId) {
        List<String> conversationIds = conversations.findAllByParticipantsContains(userId).stream()
                .map(Conversation::getId)
                .filter(Objects::nonNull)
                .toList();
        if (conversationIds.isEmpty()) {
            return 0L;
        }
        Query query = new Query();
        query.addCriteria(Criteria.where("conversationId").in(conversationIds)
                .and("senderId").ne(userId)
                .and("read").is(false)
                .and("deleted").ne(true));
        return mongoTemplate.count(query, DirectMessage.class);
    }

    private Query buildConversationQuery(String userId, String search) {
        Query query = new Query();
        query.addCriteria(Criteria.where("participants").is(userId));
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(Criteria.where("lastMessage.content").regex(pattern));
        }
        return query;
    }

    private Query buildMessageCountQuery(String conversationId, String search) {
        Query query = new Query();
        query.addCriteria(Criteria.where("conversationId").is(conversationId).and("deleted").ne(true));
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            query.addCriteria(Criteria.where("content").regex(pattern));
        }
        return query;
    }

    private Conversation requireConversation(String conversationId) {
        return conversations.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation not found", "CONVERSATION_NOT_FOUND"));
    }

    private DirectMessage requireMessage(String messageId) {
        return messages.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found", "MESSAGE_NOT_FOUND"));
    }

    private void requireParticipant(Conversation conversation, String userId) {
        if (!conversation.getParticipants().contains(userId)) {
            throw new ForbiddenException("You are not a participant in this conversation", "CONVERSATION_ACCESS_DENIED");
        }
    }

    private Conversation findExistingConversation(String userId, String receiverId) {
        return conversations.findAllByParticipantsContains(userId).stream()
                .filter(conversation -> conversation.getParticipants() != null
                        && conversation.getParticipants().size() == 2
                        && conversation.getParticipants().contains(receiverId))
                .findFirst()
                .orElse(null);
    }

    private ConversationDto hydrateConversation(Conversation conversation) {
        List<String> participantIds = conversation.getParticipants() == null ? List.of() : conversation.getParticipants();
        Map<String, User> usersById = loadUsersById(new LinkedHashSet<>(participantIds));
        List<User> orderedParticipants = participantIds.stream()
                .map(usersById::get)
                .filter(Objects::nonNull)
                .toList();
        return DirectMessageMapper.toConversationDto(conversation, orderedParticipants);
    }

    private List<ConversationDto> hydrateConversations(List<Conversation> conversations) {
        Set<String> ids = conversations.stream()
                .flatMap(conversation -> conversation.getParticipants() == null ? java.util.stream.Stream.empty() : conversation.getParticipants().stream())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<String, User> usersById = loadUsersById(ids);
        return conversations.stream()
                .map(conversation -> {
                    List<String> participantIds = conversation.getParticipants() == null ? List.of() : conversation.getParticipants();
                    List<User> participants = participantIds.stream()
                            .map(usersById::get)
                            .filter(Objects::nonNull)
                            .toList();
                    return DirectMessageMapper.toConversationDto(conversation, participants);
                })
                .toList();
    }

    private DirectMessageDto hydrateMessage(DirectMessage message) {
        User sender = requireUser(message.getSenderId());
        DirectMessage reply = message.getReplyTo() == null || message.getReplyTo().isBlank()
                ? null
                : messages.findById(message.getReplyTo()).orElse(null);
        User replySender = reply == null ? null : users.findById(reply.getSenderId()).orElse(null);
        return DirectMessageMapper.toDirectMessageDto(message, sender, reply, replySender);
    }

    private User requireUser(String userId) {
        return users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found", "USER_NOT_FOUND"));
    }

    private Map<String, User> loadUsersById(Set<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<String, User> usersById = new LinkedHashMap<>();
        for (User user : users.findAllById(ids)) {
            usersById.put(user.getId(), user);
        }
        return usersById;
    }

    private DirectMessage.DirectMessageAttachment storeAttachment(MultipartFile file) {
        FileStorageService.StoredFile stored = storageService.store(file, "direct-messages", ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES);
        DirectMessage.DirectMessageAttachment attachment = new DirectMessage.DirectMessageAttachment();
        attachment.setKey(stored.key());
        attachment.setUrl(stored.url());
        attachment.setOriginalName(stored.originalName());
        attachment.setMimeType(stored.mimeType());
        attachment.setSize(stored.size());
        return attachment;
    }

    private MessageType messageTypeFor(List<DirectMessage.DirectMessageAttachment> attachments) {
        if (attachments.isEmpty()) {
            return MessageType.TEXT;
        }
        String mimeType = attachments.get(0).getMimeType();
        if (mimeType != null && mimeType.startsWith("image/")) {
            return MessageType.IMAGE;
        }
        if ("application/pdf".equals(mimeType)) {
            return MessageType.PDF;
        }
        return MessageType.DOCUMENT;
    }
}
