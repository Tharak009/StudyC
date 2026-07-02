package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.entity.Conversation;
import com.studyconnect.backend.entity.DirectMessage;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.MessageType;
import com.studyconnect.backend.exception.ForbiddenException;
import com.studyconnect.backend.repository.ConversationRepository;
import com.studyconnect.backend.repository.DirectMessageRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class DirectMessageServiceTest {

    @Mock private ConversationRepository conversations;
    @Mock private DirectMessageRepository messages;
    @Mock private UserRepository users;
    @Mock private FileStorageService storageService;
    @Mock private MongoTemplate mongoTemplate;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @Test
    void startConversationCreatesAndBroadcasts() {
        when(conversations.findAllByParticipantsContains("user-1")).thenReturn(List.of());
        when(users.findById("user-2")).thenReturn(Optional.of(user("user-2", "Receiver")));
        when(users.findAllById(any(Iterable.class))).thenReturn(List.of(
                user("user-1", "Sender"),
                user("user-2", "Receiver")
        ));
        when(conversations.save(any(Conversation.class))).thenAnswer(invocation -> {
            Conversation conversation = invocation.getArgument(0);
            conversation.setId("conversation-1");
            conversation.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            conversation.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            return conversation;
        });

        DirectMessageService service = new DirectMessageService(conversations, messages, users, storageService, mongoTemplate, messagingTemplate);
        var result = service.startConversation("user-1", "user-2");

        assertThat(result.id()).isEqualTo("conversation-1");
        assertThat(result.participants()).hasSize(2);
        verify(messagingTemplate).convertAndSend(eq("/topic/dm/conversationCreated"), any(Object.class));
    }

    @Test
    void sendMessageStoresAttachmentAndBroadcasts() {
        Conversation conversation = conversation("conversation-1", List.of("user-1", "user-2"));
        when(conversations.findById("conversation-1")).thenReturn(Optional.of(conversation));
        when(users.findById("user-1")).thenReturn(Optional.of(user("user-1", "Sender")));
        when(storageService.store(any(MultipartFile.class), eq("direct-messages"), any(), eq(5L * 1024 * 1024))).thenReturn(
                new FileStorageService.StoredFile("direct-messages/file.pdf", "/uploads/direct-messages/file.pdf", "file.pdf", "application/pdf", 128L, Instant.now()));
        when(messages.save(any(DirectMessage.class))).thenAnswer(invocation -> {
            DirectMessage message = invocation.getArgument(0);
            message.setId("message-1");
            message.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            message.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            return message;
        });

        DirectMessageService service = new DirectMessageService(conversations, messages, users, storageService, mongoTemplate, messagingTemplate);
        var result = service.sendMessage("conversation-1", "user-1", "Hello", null, List.of(new MockMultipartFile("attachments", "file.pdf", "application/pdf", new byte[] {1, 2})));

        assertThat(result.id()).isEqualTo("message-1");
        assertThat(result.messageType()).isEqualTo(MessageType.PDF);
        verify(messagingTemplate).convertAndSend(eq("/topic/dm/conversation-1/directMessageCreated"), any(Object.class));
    }

    @Test
    void editMessageRejectsNonSender() {
        when(messages.findById("message-1")).thenReturn(Optional.of(baseMessage("message-1", "conversation-1", "user-1")));

        DirectMessageService service = new DirectMessageService(conversations, messages, users, storageService, mongoTemplate, messagingTemplate);
        assertThrows(ForbiddenException.class, () -> service.editMessage("message-1", "user-2", "Updated"));
    }

    @Test
    void deleteMessageAllowsSender() {
        when(messages.findById("message-1")).thenReturn(Optional.of(baseMessage("message-1", "conversation-1", "user-1")));
        when(messages.save(any(DirectMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("user-1")).thenReturn(Optional.of(user("user-1", "Sender")));

        DirectMessageService service = new DirectMessageService(conversations, messages, users, storageService, mongoTemplate, messagingTemplate);
        var deleted = service.deleteMessage("message-1", "user-1");

        assertThat(deleted.deleted()).isTrue();
        assertThat(deleted.content()).isEmpty();
        verify(messagingTemplate).convertAndSend(eq("/topic/dm/conversation-1/directMessageDeleted"), any(Object.class));
    }

    @Test
    void unreadCountAggregatesAcrossUserConversations() {
        Conversation conversation = conversation("conversation-1", List.of("user-1", "user-2"));
        when(conversations.findAllByParticipantsContains("user-1")).thenReturn(List.of(conversation));
        when(mongoTemplate.count(any(), eq(DirectMessage.class))).thenReturn(4L);

        DirectMessageService service = new DirectMessageService(conversations, messages, users, storageService, mongoTemplate, messagingTemplate);
        assertThat(service.unreadCount("user-1")).isEqualTo(4L);
    }

    private Conversation conversation(String id, List<String> participants) {
        Conversation conversation = new Conversation();
        conversation.setId(id);
        conversation.setParticipants(participants);
        return conversation;
    }

    private DirectMessage baseMessage(String id, String conversationId, String senderId) {
        DirectMessage message = new DirectMessage();
        message.setId(id);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setContent("Hello");
        message.setMessageType(MessageType.TEXT);
        message.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        message.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return message;
    }

    private User user(String id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        user.setRollNumber("RN-" + id);
        user.setProfilePicture("/uploads/profiles/" + id + ".png");
        user.setDepartment("CSE");
        return user;
    }
}
