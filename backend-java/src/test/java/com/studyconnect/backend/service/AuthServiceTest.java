package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.dto.auth.ChangePasswordRequest;
import com.studyconnect.backend.dto.auth.ForgotPasswordRequest;
import com.studyconnect.backend.dto.auth.LoginRequest;
import com.studyconnect.backend.dto.auth.RegisterRequest;
import com.studyconnect.backend.dto.auth.ResetPasswordRequest;
import com.studyconnect.backend.entity.RefreshToken;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.repository.RefreshTokenRepository;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import io.jsonwebtoken.Claims;
import java.time.Duration;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock private UserRepository users;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;
    @Mock private EmailService emailService;
    @Mock private StudyConnectProperties properties;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(properties.approvedEmailDomains()).thenReturn(List.of("college.edu"));
        lenient().when(properties.jwt()).thenReturn(new StudyConnectProperties.Jwt("access-secret-01234567890123456789012345678901",
                "refresh-secret-01234567890123456789012345678901",
                Duration.ofMinutes(15),
                7));
        authService = new AuthService(users, refreshTokens, passwordEncoder, authenticationManager, jwtService, properties, emailService);
    }

    @Test
    void registerCreatesStudentWithHashedPasswordAndTokens() {
        when(users.findByEmailIgnoreCase("student@college.edu")).thenReturn(Optional.empty());
        when(users.findByRollNumberIgnoreCase("CSE01")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password1")).thenReturn("hashed-password");
        when(jwtService.newTokenId()).thenReturn("token-1");
        when(jwtService.createAccessToken(anyString(), any())).thenReturn("access-token");
        when(jwtService.createRefreshToken(anyString(), anyString())).thenReturn("refresh-token");
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId("user-1");
            return user;
        });

        var result = authService.register(new RegisterRequest(
                "Student One",
                "CSE01",
                "CSE",
                2,
                "student@college.edu",
                "Password1"
        ), "JUnit", "127.0.0.1");

        assertThat(result.user().role()).isEqualTo(Role.STUDENT);
        assertThat(result.user().status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(result.user().email()).isEqualTo("student@college.edu");
        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        verify(refreshTokens).save(any(RefreshToken.class));
    }

    @Test
    void loginAuthenticatesAndUpdatesLastLogin() {
        User user = baseUser();
        user.setPassword("hashed-password");
        when(authenticationManager.authenticate(any(Authentication.class))).thenReturn(
                new UsernamePasswordAuthenticationToken("student@college.edu", "Password1"));
        when(users.findByEmailIgnoreCase("student@college.edu")).thenReturn(Optional.of(user));
        when(jwtService.newTokenId()).thenReturn("token-1");
        when(jwtService.createAccessToken(anyString(), any())).thenReturn("access-token");
        when(jwtService.createRefreshToken(anyString(), anyString())).thenReturn("refresh-token");
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = authService.login(new LoginRequest("student@college.edu", "Password1"), "JUnit", "127.0.0.1");

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(user.getLastLogin()).isNotNull();
        verify(users).save(user);
    }

    @Test
    void refreshRotatesRefreshToken() {
        User user = baseUser();
        RefreshToken stored = new RefreshToken();
        stored.setTokenId("token-1");
        stored.setTokenHash(hash("refresh-token"));
        stored.setUserId("user-1");
        stored.setExpiresAt(Instant.now().plusSeconds(600));

        Claims claims = org.mockito.Mockito.mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("refresh");
        when(claims.getId()).thenReturn("token-1");
        when(claims.getSubject()).thenReturn("user-1");

        when(jwtService.parseRefreshToken("refresh-token")).thenReturn(claims);
        when(refreshTokens.findByTokenId("token-1")).thenReturn(Optional.of(stored));
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(jwtService.newTokenId()).thenReturn("token-2");
        when(jwtService.createAccessToken(anyString(), any())).thenReturn("new-access");
        when(jwtService.createRefreshToken(anyString(), anyString())).thenReturn("new-refresh");
        when(refreshTokens.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = authService.refresh("refresh-token", "JUnit", "127.0.0.1");

        assertThat(result.accessToken()).isEqualTo("new-access");
        assertThat(result.refreshToken()).isEqualTo("new-refresh");
        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokens).save(stored);
    }

    @Test
    void logoutRevokesRefreshToken() {
        RefreshToken token = new RefreshToken();
        token.setTokenId("token-1");
        token.setUserId("user-1");
        Claims claims = org.mockito.Mockito.mock(Claims.class);
        when(claims.getId()).thenReturn("token-1");
        when(jwtService.parseRefreshToken("refresh-token")).thenReturn(claims);
        when(refreshTokens.findByTokenId("token-1")).thenReturn(Optional.of(token));

        authService.logout("refresh-token");

        assertThat(token.getRevokedAt()).isNotNull();
    }

    @Test
    void forgotPasswordStoresHashedResetToken() {
        User user = baseUser();
        when(users.findByEmailIgnoreCase("student@college.edu")).thenReturn(Optional.of(user));
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.forgotPassword(new ForgotPasswordRequest("student@college.edu"));

        assertThat(user.getPasswordResetTokenHash()).isNotBlank();
        assertThat(user.getPasswordResetExpiresAt()).isAfter(Instant.now());
        verify(emailService).sendPasswordReset(anyString(), anyString(), any());
    }

    @Test
    void resetPasswordUpdatesPasswordAndClearsResetState() {
        User user = baseUser();
        user.setPasswordResetTokenHash(hash("plain-token"));
        user.setPasswordResetExpiresAt(Instant.now().plusSeconds(600));
        when(users.findAll()).thenReturn(List.of(user));
        when(passwordEncoder.encode("NewPassword1")).thenReturn("encoded-new");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.resetPassword(new ResetPasswordRequest("plain-token", "NewPassword1"));

        assertThat(user.getPassword()).isEqualTo("encoded-new");
        assertThat(user.getPasswordResetTokenHash()).isNull();
        assertThat(user.getPasswordResetExpiresAt()).isNull();
    }

    @Test
    void changePasswordVerifiesCurrentPasswordAndRevokesSessions() {
        User user = baseUser();
        user.setPassword("current-hash");
        when(users.findById("user-1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Current1", "current-hash")).thenReturn(true);
        when(passwordEncoder.encode("NewPassword1")).thenReturn("new-hash");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        RefreshToken existing = new RefreshToken();
        existing.setTokenId("token-1");
        existing.setUserId("user-1");
        when(refreshTokens.findAllByUserId("user-1")).thenReturn(List.of(existing));

        authService.changePassword("user-1", new ChangePasswordRequest("Current1", "NewPassword1"));

        assertThat(user.getPassword()).isEqualTo("new-hash");
        assertThat(user.getPasswordChangedAt()).isNotNull();
        verify(refreshTokens).save(existing);
    }

    @Test
    void registerRejectsUnapprovedCollegeEmail() {
        assertThrows(RuntimeException.class, () -> authService.register(new RegisterRequest(
                "Student One",
                "CSE01",
                "CSE",
                2,
                "student@gmail.com",
                "Password1"
        ), "JUnit", "127.0.0.1"));
        verify(users, never()).save(any(User.class));
    }

    private User baseUser() {
        User user = new User();
        user.setId("user-1");
        user.setFullName("Student One");
        user.setRollNumber("CSE01");
        user.setDepartment("CSE");
        user.setAcademicYear(2);
        user.setEmail("student@college.edu");
        user.setRole(Role.STUDENT);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
