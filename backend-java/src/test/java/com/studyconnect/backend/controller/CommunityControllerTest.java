package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyconnect.backend.dto.community.CommunityDto;
import com.studyconnect.backend.dto.community.CommunityExtensionPointsDto;
import com.studyconnect.backend.dto.community.CommunityPageDto;
import com.studyconnect.backend.dto.community.CommunityUserDto;
import com.studyconnect.backend.entity.enums.CommunityCategory;
import com.studyconnect.backend.entity.enums.CommunityRole;
import com.studyconnect.backend.entity.enums.CommunityVisibility;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.CommunityService;
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

@WebMvcTest(CommunityController.class)
@AutoConfigureMockMvc
class CommunityControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private CommunityService communityService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(username = "owner-1")
    void createReturnsCreatedCommunity() throws Exception {
        when(communityService.create(any(), eq("owner-1"))).thenReturn(sampleCommunity("community-1"));
        MockMultipartFile banner = new MockMultipartFile("bannerImage", "banner.png", MediaType.IMAGE_PNG_VALUE, new byte[] {1});

        mockMvc.perform(multipart("/api/communities")
                        .file(banner)
                        .param("name", "Study Club")
                        .param("description", "A place to learn")
                        .param("category", "Web Development")
                        .param("tags", "react")
                        .param("visibility", "public")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Community created"))
                .andExpect(jsonPath("$.data._id").value("community-1"));
    }

    @Test
    @WithMockUser(username = "owner-1")
    void listReturnsPaginatedResponse() throws Exception {
        when(communityService.list(eq("study"), eq("Web Development"), eq(1), eq(12), eq("owner-1")))
                .thenReturn(new CommunityPageDto(List.of(sampleCommunity("community-1")), 1, 1, 12, 1));

        mockMvc.perform(get("/api/communities")
                        .param("search", "study")
                        .param("category", "Web Development"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Communities retrieved"))
                .andExpect(jsonPath("$.data.items[0]._id").value("community-1"));
    }

    @Test
    @WithMockUser(username = "owner-1")
    void joinReturnsCompatibleCommunityShape() throws Exception {
        when(communityService.join("community-1", "owner-1")).thenReturn(sampleCommunity("community-1"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/communities/community-1/join")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Joined community"))
                .andExpect(jsonPath("$.data.membershipRole").value("OWNER"));
    }

    private CommunityDto sampleCommunity(String id) {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new CommunityDto(
                id,
                "Study Club",
                "study-club",
                "A place to learn",
                "/uploads/communities/banner.png",
                CommunityCategory.WEB_DEVELOPMENT,
                List.of("react"),
                CommunityVisibility.PUBLIC,
                new CommunityUserDto("owner-1", "Owner One", "CSE01", null, null, "/uploads/profiles/owner.png"),
                List.of("moderator-1"),
                1,
                new CommunityExtensionPointsDto(false, false, false),
                CommunityRole.OWNER,
                true,
                now,
                now);
    }
}
