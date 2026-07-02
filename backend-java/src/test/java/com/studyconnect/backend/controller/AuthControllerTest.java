package com.studyconnect.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.dto.auth.AuthResult;
import com.studyconnect.backend.dto.auth.ChangePasswordRequest;
import com.studyconnect.backend.dto.auth.ForgotPasswordRequest;
import com.studyconnect.backend.dto.auth.LoginRequest;
import com.studyconnect.backend.dto.auth.RegisterRequest;
import com.studyconnect.backend.dto.auth.ResetPasswordRequest;
import com.studyconnect.backend.dto.user.UserDto;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import com.studyconnect.backend.service.AuthService;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService;
    @MockBean private StudyConnectProperties properties;
    @MockBean private JwtService jwtService;
    @MockBean private UserRepository userRepository;

    @Test
    void registerReturnsCreatedAndRefreshCookieForWeb() throws Exception {
        when(properties.cookieSecure()).thenReturn(false);
        when(properties.jwt()).thenReturn(new StudyConnectProperties.Jwt("access-secret-01234567890123456789012345678901",
                "refresh-secret-01234567890123456789012345678901",
                Duration.ofMinutes(15),
                7));
        when(authService.register(any(RegisterRequest.class), any(), any()))
                .thenReturn(sampleAuthResult(true));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("x-client-platform", "mobile")
                        .content("""
                                {
                                  "fullName":"Student One",
                                  "rollNumber":"CSE01",
                                  "department":"CSE",
                                  "academicYear":2,
                                  "email":"student@college.edu",
                                  "password":"Password1"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(cookie().exists("studyconnect_refresh"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"));
    }

    @Test
    void loginOmitsRefreshTokenForWeb() throws Exception {
        when(properties.cookieSecure()).thenReturn(false);
        when(properties.jwt()).thenReturn(new StudyConnectProperties.Jwt("access-secret-01234567890123456789012345678901",
                "refresh-secret-01234567890123456789012345678901",
                Duration.ofMinutes(15),
                7));
        when(authService.login(any(LoginRequest.class), any(), any()))
                .thenReturn(sampleAuthResult(false));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email":"student@college.edu",
                                  "password":"Password1"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("studyconnect_refresh"))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
    }

    @Test
    void logoutClearsCookie() throws Exception {
        when(properties.cookieSecure()).thenReturn(false);
        when(properties.jwt()).thenReturn(new StudyConnectProperties.Jwt("access-secret-01234567890123456789012345678901",
                "refresh-secret-01234567890123456789012345678901",
                Duration.ofMinutes(15),
                7));

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("studyconnect_refresh", 0));
    }

    private AuthResult sampleAuthResult(boolean includeRefresh) {
        UserDto user = new UserDto(
                "user-1",
                "Student One",
                "CSE01",
                "CSE",
                2,
                "student@college.edu",
                null,
                "",
                List.of(),
                Role.STUDENT,
                UserStatus.ACTIVE,
                Instant.now(),
                Instant.now(),
                Instant.now());
        return new AuthResult(user, "access-token", includeRefresh ? "refresh-token" : null);
    }
}
