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

import com.studyconnect.backend.dto.resource.PaginatedResourcesDto;
import com.studyconnect.backend.dto.resource.ResourceCommunityDto;
import com.studyconnect.backend.dto.resource.ResourceDto;
import com.studyconnect.backend.dto.resource.ResourceCreateRequest;
import com.studyconnect.backend.dto.resource.ResourceUpdateRequest;
import com.studyconnect.backend.dto.resource.ResourceUploaderDto;
import com.studyconnect.backend.entity.enums.ResourceCategory;
import com.studyconnect.backend.entity.enums.ResourceVisibility;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.ResourceService;
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
import org.springframework.web.multipart.MultipartFile;

@WebMvcTest(ResourceController.class)
@AutoConfigureMockMvc
class ResourceControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private ResourceService resourceService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(username = "user-1")
    void listReturnsPaginatedResources() throws Exception {
        when(resourceService.listResources(eq("community-1"), eq("user-1"), eq(1), eq(20), isNull(), isNull(), isNull(), eq("recent")))
                .thenReturn(new PaginatedResourcesDto(List.of(sampleResource()), 1, 1, 20, 1));

        mockMvc.perform(get("/api/communities/community-1/resources"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Resources retrieved"))
                .andExpect(jsonPath("$.data.items[0]._id").value("resource-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void createReturnsCreatedResource() throws Exception {
        when(resourceService.createResource(eq("community-1"), eq("user-1"), any(ResourceCreateRequest.class), any(MultipartFile.class))).thenReturn(sampleResource());
        MockMultipartFile file = new MockMultipartFile("file", "file.pdf", MediaType.APPLICATION_PDF_VALUE, new byte[] {1});

        mockMvc.perform(multipart("/api/communities/community-1/resources")
                        .file(file)
                        .param("title", "Notes")
                        .param("description", "Summary")
                        .param("category", "NOTES")
                        .param("visibility", "COMMUNITY")
                        .param("tags", "spring")
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Resource uploaded"))
                .andExpect(jsonPath("$.data._id").value("resource-1"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void updateReturnsUpdatedResource() throws Exception {
        when(resourceService.updateResource(eq("resource-1"), eq("user-1"), any(ResourceUpdateRequest.class), any(MultipartFile.class))).thenReturn(sampleResource());

        mockMvc.perform(multipart("/api/resources/resource-1")
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .param("title", "Updated")
                        .param("category", "NOTES")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Resource updated"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void deleteReturnsSuccess() throws Exception {
        mockMvc.perform(delete("/api/resources/resource-1").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Resource deleted"));
    }

    @Test
    @WithMockUser(username = "user-1")
    void downloadReturnsTrackedResource() throws Exception {
        when(resourceService.trackDownload("resource-1", "user-1")).thenReturn(sampleResource());

        mockMvc.perform(post("/api/resources/resource-1/download").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Download tracked"));
    }

    private ResourceDto sampleResource() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        return new ResourceDto(
                "resource-1",
                "Notes",
                "Summary",
                "file.pdf",
                "/uploads/resources/file.pdf",
                1024L,
                "application/pdf",
                ResourceCategory.NOTES,
                List.of("spring"),
                new ResourceUploaderDto("user-1", "Student One", "RN-1", "/uploads/profiles/avatar.png"),
                new ResourceCommunityDto("community-1", "Study Club", "study-club"),
                3L,
                ResourceVisibility.COMMUNITY,
                now,
                now);
    }
}
