package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.studyconnect.backend.dto.user.UserDto;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.UserService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.context.support.WithMockUser;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private UserService userService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(username = "user-1")
    void profileReturnsCompatibleMessage() throws Exception {
        when(userService.getProfile("user-1")).thenReturn(sampleUser());

        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Profile retrieved"))
                .andExpect(jsonPath("$.data._id").value("user-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void uploadProfilePictureUsesExpectedFieldName() throws Exception {
        when(userService.uploadProfilePicture(any(), any())).thenReturn(sampleUser());
        MockMultipartFile file = new MockMultipartFile(
                "profilePicture",
                "avatar.png",
                MediaType.IMAGE_PNG_VALUE,
                new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/users/profile-picture").file(file).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Profile picture updated"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void emptyProfileUpdateIsRejected() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void searchReturnsCompatibleResponseShape() throws Exception {
        when(userService.search(eq("Stu"), eq("user-1"))).thenReturn(List.of(sampleUser()));

        mockMvc.perform(get("/api/users/search").param("q", "Stu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Users found"))
                .andExpect(jsonPath("$.data[0]._id").value("user-1"));
    }

    private UserDto sampleUser() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new UserDto(
                "user-1",
                "Student One",
                "CSE01",
                "CSE",
                2,
                "student@college.edu",
                "/uploads/profiles/avatar.png",
                "",
                List.of("React"),
                Role.STUDENT,
                UserStatus.ACTIVE,
                now,
                now,
                now);
    }
}
