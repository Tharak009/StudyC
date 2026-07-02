package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyconnect.backend.dto.directmessage.ConversationDto;
import com.studyconnect.backend.dto.directmessage.ConversationLastMessageDto;
import com.studyconnect.backend.dto.directmessage.ConversationParticipantDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageAttachmentDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageReplyDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageReplySenderDto;
import com.studyconnect.backend.dto.directmessage.DirectMessageSenderDto;
import com.studyconnect.backend.dto.directmessage.EditDirectMessageRequest;
import com.studyconnect.backend.dto.directmessage.PaginatedConversationsDto;
import com.studyconnect.backend.dto.directmessage.PaginatedDirectMessagesDto;
import com.studyconnect.backend.dto.directmessage.StartConversationRequest;
import com.studyconnect.backend.entity.enums.MessageType;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.DirectMessageService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DirectMessageController.class)
@AutoConfigureMockMvc
class DirectMessageControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private DirectMessageService directMessageService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(username = "user-1")
    void startConversationReturnsConversation() throws Exception {
        when(directMessageService.startConversation(eq("user-1"), eq("user-2"))).thenReturn(sampleConversation());

                mockMvc.perform(post("/api/direct-messages/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"receiverId\":\"user-2\"}")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Conversation started"))
                .andExpect(jsonPath("$.data._id").value("conversation-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void listConversationsReturnsPaginatedResults() throws Exception {
        when(directMessageService.listConversations(eq("user-1"), eq(1), eq(20), eq("search")))
                .thenReturn(new PaginatedConversationsDto(List.of(sampleConversation()), 1, 1, 20, 1));

        mockMvc.perform(get("/api/direct-messages/conversations").param("search", "search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0]._id").value("conversation-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void getMessagesReturnsPaginatedHistory() throws Exception {
        when(directMessageService.getMessages(eq("conversation-1"), eq("user-1"), eq(1), eq(30), eq("latest"), isNull()))
                .thenReturn(new PaginatedDirectMessagesDto(List.of(sampleMessage()), 1, 1, 30, 1, "latest"));

        mockMvc.perform(get("/api/direct-messages/conversations/conversation-1/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Messages retrieved"))
                .andExpect(jsonPath("$.data.items[0]._id").value("message-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void sendMessageReturnsCreatedMessage() throws Exception {
        when(directMessageService.sendMessage(eq("conversation-1"), eq("user-1"), eq("Hello"), eq("message-0"), any()))
                .thenReturn(sampleMessage());
        MockMultipartFile file = new MockMultipartFile("attachments", "file.txt", MediaType.TEXT_PLAIN_VALUE, new byte[] {1});

                mockMvc.perform(multipart("/api/direct-messages/conversations/conversation-1/messages")
                        .file(file)
                        .param("content", "Hello")
                        .param("replyTo", "message-0")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Message sent"))
                .andExpect(jsonPath("$.data._id").value("message-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void editMessageReturnsUpdatedMessage() throws Exception {
        when(directMessageService.editMessage(eq("message-1"), eq("user-1"), eq("Updated")))
                .thenReturn(sampleMessage());

        mockMvc.perform(put("/api/direct-messages/messages/message-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Updated\"}")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Message edited"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void unreadCountReturnsCount() throws Exception {
        when(directMessageService.unreadCount("user-1")).thenReturn(9L);

        mockMvc.perform(get("/api/direct-messages/conversations/unread"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(9));
    }

    @Test
    @WithMockUser(username = "user-1")
    void markAsReadReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/direct-messages/messages/read")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"conversationId\":\"conversation-1\"}")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Messages marked as read"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void deleteMessageReturnsDeletedMessage() throws Exception {
        when(directMessageService.deleteMessage(eq("message-1"), eq("user-1"))).thenReturn(sampleMessage());

        mockMvc.perform(delete("/api/direct-messages/messages/message-1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Message deleted"));
    }

    private ConversationDto sampleConversation() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new ConversationDto(
                "conversation-1",
                List.of(new ConversationParticipantDto("user-1", "Sender", "RN-1", "/uploads/profiles/user-1.png", "CSE"),
                        new ConversationParticipantDto("user-2", "Receiver", "RN-2", "/uploads/profiles/user-2.png", "ECE")),
                new ConversationLastMessageDto("Hello", "user-1", now),
                now,
                now,
                now);
    }

    private DirectMessageDto sampleMessage() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new DirectMessageDto(
                "message-1",
                "conversation-1",
                new DirectMessageSenderDto("user-1", "Sender", "RN-1", "/uploads/profiles/user-1.png"),
                "Hello",
                MessageType.TEXT,
                List.of(new DirectMessageAttachmentDto("direct-messages/file.txt", "/uploads/direct-messages/file.txt", "file.txt", "text/plain", 12L)),
                new DirectMessageReplyDto("message-0", "Previous", false, new DirectMessageReplySenderDto("user-2", "Receiver")),
                false,
                null,
                false,
                null,
                false,
                null,
                now,
                now);
    }
}
