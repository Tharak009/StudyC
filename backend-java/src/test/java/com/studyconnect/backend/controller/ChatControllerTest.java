package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyconnect.backend.dto.chat.ChatAttachmentDto;
import com.studyconnect.backend.dto.chat.ChatMessageDto;
import com.studyconnect.backend.dto.chat.PaginatedChatMessagesDto;
import com.studyconnect.backend.dto.community.CommunityUserDto;
import com.studyconnect.backend.entity.enums.MessageType;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.ChatService;
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

@WebMvcTest(ChatController.class)
@AutoConfigureMockMvc
class ChatControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private ChatService chatService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(username = "user-1")
    void historyReturnsPaginatedMessages() throws Exception {
        when(chatService.listMessages(eq("community-1"), eq("user-1"), eq(1), eq(30), eq("latest")))
                .thenReturn(new PaginatedChatMessagesDto(List.of(sampleMessage()), 1, 1, 30, 1, "latest"));

        mockMvc.perform(get("/api/communities/community-1/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Messages retrieved"))
                .andExpect(jsonPath("$.data.items[0]._id").value("message-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void createReturnsCreatedMessage() throws Exception {
        when(chatService.createMessage(eq("community-1"), eq("user-1"), eq("Hello"), isNull(), any()))
                .thenReturn(sampleMessage());
        MockMultipartFile attachment = new MockMultipartFile("attachments", "file.txt", MediaType.TEXT_PLAIN_VALUE, new byte[] {1});

        mockMvc.perform(multipart("/api/communities/community-1/messages")
                        .file(attachment)
                        .param("content", "Hello")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Message created"))
                .andExpect(jsonPath("$.data._id").value("message-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void editReturnsUpdatedMessage() throws Exception {
        when(chatService.editMessage(eq("community-1"), eq("message-1"), eq("user-1"), eq("Updated")))
                .thenReturn(sampleMessage());

        mockMvc.perform(put("/api/communities/community-1/messages/message-1")
                        .param("content", "Updated")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Message updated"));
    }

    private ChatMessageDto sampleMessage() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new ChatMessageDto(
                "message-1",
                "community-1",
                new CommunityUserDto("user-1", "Student One", "CSE01", null, null, "/uploads/profiles/avatar.png"),
                "Hello",
                MessageType.TEXT,
                List.of(new ChatAttachmentDto("chat/file.txt", "/uploads/chat/file.txt", "file.txt", "text/plain", 12L)),
                null,
                false,
                null,
                false,
                null,
                now,
                now);
    }
}
