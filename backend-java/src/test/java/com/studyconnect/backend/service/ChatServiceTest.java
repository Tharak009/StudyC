package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.entity.CommunityMember;
import com.studyconnect.backend.entity.Message;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.MessageType;
import com.studyconnect.backend.exception.ApiException;
import com.studyconnect.backend.repository.CommunityMemberRepository;
import com.studyconnect.backend.repository.MessageRepository;
import com.studyconnect.backend.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private MessageRepository messages;
    @Mock private CommunityMemberRepository members;
    @Mock private UserRepository users;
    @Mock private FileStorageService storageService;
    @Mock private MongoTemplate mongoTemplate;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private ApplicationEventPublisher eventPublisher;

    @Test
    void createMessageStoresAttachmentAndBroadcasts() {
        when(members.findByCommunityIdAndUserId("community-1", "user-1")).thenReturn(Optional.of(member("community-1", "user-1", CommunityRole.MEMBER)));
        when(storageService.store(any(), eq("chat"), any(), eq(5L * 1024 * 1024))).thenReturn(
                new FileStorageService.StoredFile("chat/file.txt", "/uploads/chat/file.txt", "file.txt", "text/plain", 12L, Instant.now()));
        when(messages.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId("message-1");
            message.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            message.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
            return message;
        });
        when(users.findById("user-1")).thenReturn(Optional.of(baseUser("user-1")));

        ChatService service = new ChatService(messages, members, users, storageService, mongoTemplate, messagingTemplate, eventPublisher);
        var result = service.createMessage(
                "community-1",
                "user-1",
                "Hello world",
                null,
                List.of(new MockMultipartFile("attachments", "file.txt", "text/plain", new byte[] {1, 2}))
        );

        assertThat(result.id()).isEqualTo("message-1");
        assertThat(result.messageType()).isEqualTo(MessageType.DOCUMENT);
        verify(messagingTemplate).convertAndSend(eq("/topic/community/community-1/messageCreated"), any(Object.class));
    }

    @Test
    void listMessagesReturnsLatestPagination() {
        when(members.findByCommunityIdAndUserId("community-1", "user-1")).thenReturn(Optional.of(member("community-1", "user-1", CommunityRole.MEMBER)));
        Message message = baseMessage("message-1", "community-1", "user-1");
        when(mongoTemplate.find(any(Query.class), eq(Message.class))).thenReturn(List.of(message));
        when(mongoTemplate.count(any(Query.class), eq(Message.class))).thenReturn(1L);
        when(users.findById("user-1")).thenReturn(Optional.of(baseUser("user-1")));

        ChatService service = new ChatService(messages, members, users, storageService, mongoTemplate, messagingTemplate, eventPublisher);
        var result = service.listMessages("community-1", "user-1", 1, 30, "latest");

        assertThat(result.items()).hasSize(1);
        assertThat(result.order()).isEqualTo("latest");
    }

    @Test
    void editMessageRejectsNonSender() {
        when(members.findByCommunityIdAndUserId("community-1", "user-2")).thenReturn(Optional.of(member("community-1", "user-2", CommunityRole.MEMBER)));
        when(messages.findById("message-1")).thenReturn(Optional.of(baseMessage("message-1", "community-1", "user-1")));

        ChatService service = new ChatService(messages, members, users, storageService, mongoTemplate, messagingTemplate, eventPublisher);
        ApiException exception = assertThrows(ApiException.class, () -> service.editMessage("community-1", "message-1", "user-2", "Updated"));

        assertThat(exception.getCode()).isEqualTo("MESSAGE_EDIT_FORBIDDEN");
    }

    @Test
    void deleteMessageAllowsModerator() {
        when(members.findByCommunityIdAndUserId("community-1", "user-2")).thenReturn(Optional.of(member("community-1", "user-2", CommunityRole.MODERATOR)));
        when(messages.findById("message-1")).thenReturn(Optional.of(baseMessage("message-1", "community-1", "user-1")));
        when(messages.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.findById("user-1")).thenReturn(Optional.of(baseUser("user-1")));

        ChatService service = new ChatService(messages, members, users, storageService, mongoTemplate, messagingTemplate, eventPublisher);
        var deleted = service.deleteMessage("community-1", "message-1", "user-2");

        assertThat(deleted.deleted()).isTrue();
        verify(messagingTemplate).convertAndSend(eq("/topic/community/community-1/messageDeleted"), any(Object.class));
    }

    private CommunityMember member(String communityId, String userId, CommunityRole role) {
        CommunityMember member = new CommunityMember();
        member.setCommunityId(communityId);
        member.setUserId(userId);
        member.setRole(role);
        return member;
    }

    private Message baseMessage(String id, String communityId, String senderId) {
        Message message = new Message();
        message.setId(id);
        message.setCommunityId(communityId);
        message.setSenderId(senderId);
        message.setContent("Hello");
        message.setMessageType(MessageType.TEXT);
        message.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        message.setUpdatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        return message;
    }

    private User baseUser(String id) {
        User user = new User();
        user.setId(id);
        user.setFullName("Student One");
        user.setRollNumber("CSE01");
        user.setProfilePicture("/uploads/profiles/avatar.png");
        return user;
    }
}
