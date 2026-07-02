package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyconnect.backend.dto.admin.AdminDashboardStatsDto;
import com.studyconnect.backend.dto.admin.ReviewReportRequest;
import com.studyconnect.backend.dto.report.ReportDto;
import com.studyconnect.backend.dto.report.ReportUserSummaryDto;
import com.studyconnect.backend.dto.report.ReviewedBySummaryDto;
import com.studyconnect.backend.entity.enums.ReportStatus;
import com.studyconnect.backend.entity.enums.ReportTargetType;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.AdminService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AdminService adminService;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void dashboardReturnsAdminStatsShape() throws Exception {
        when(adminService.getDashboardStats()).thenReturn(new AdminDashboardStatsDto(
                10L,
                4L,
                8L,
                2L,
                6L,
                List.of(Map.of(
                        "_id", "log-1",
                        "adminId", Map.of("_id", "admin-1", "fullName", "Admin User", "rollNumber", "ADM01"),
                        "action", "DELETE_USER",
                        "targetType", "User",
                        "targetId", "user-1",
                        "details", Map.of("reason", "cleanup"),
                        "createdAt", Instant.parse("2026-01-01T00:00:00Z")))));

        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Dashboard stats retrieved"))
                .andExpect(jsonPath("$.data.recentActivity[0].adminId.fullName").value("Admin User"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reviewReportPreservesRequestAndResponseShape() throws Exception {
        when(adminService.reviewReport(any(), any(), any())).thenReturn(new ReportDto(
                "report-1",
                new ReportUserSummaryDto("reporter-1", "Student One", "CSE01", "student@college.edu", null),
                ReportTargetType.USER,
                "target-1",
                "Spam",
                "Reviewed",
                ReportStatus.RESOLVED,
                new ReviewedBySummaryDto("admin-1", "Admin User", "ADM01"),
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z")));

        mockMvc.perform(patch("/api/admin/reports/report-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status":"RESOLVED",
                                  "description":"Reviewed"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Report reviewed"))
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.reviewedBy.fullName").value("Admin User"));
    }
}
