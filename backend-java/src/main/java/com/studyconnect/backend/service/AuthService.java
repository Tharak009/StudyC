package com.studyconnect.backend.service;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.dto.auth.AuthResult;
import com.studyconnect.backend.dto.auth.ChangePasswordRequest;
import com.studyconnect.backend.dto.auth.ForgotPasswordRequest;
import com.studyconnect.backend.dto.auth.LoginRequest;
import com.studyconnect.backend.dto.auth.RefreshTokenRequest;
import com.studyconnect.backend.dto.auth.RegisterRequest;
import com.studyconnect.backend.dto.auth.ResetPasswordRequest;
import com.studyconnect.backend.dto.user.UserDto;
import com.studyconnect.backend.entity.RefreshToken;
import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.exception.BadRequestException;
import com.studyconnect.backend.exception.ConflictException;
import com.studyconnect.backend.exception.NotFoundException;
import com.studyconnect.backend.exception.UnauthorizedException;
import com.studyconnect.backend.repository.RefreshTokenRepository;
import com.studyconnect.backend.repository.UserRepository;
import com.studyconnect.backend.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final StudyConnectProperties properties;
    private final EmailService emailService;

    public AuthService(
            UserRepository users,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            StudyConnectProperties properties,
            EmailService emailService) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.properties = properties;
        this.emailService = emailService;
    }

    @Transactional
    public AuthResult register(RegisterRequest request, String userAgent, String ipAddress) {
        assertApprovedEmail(request.email());
        users.findByEmailIgnoreCase(request.email()).ifPresent(user -> {
            throw new ConflictException("An account with this email already exists", "EMAIL_EXISTS");
        });
        users.findByRollNumberIgnoreCase(request.rollNumber()).ifPresent(user -> {
            throw new ConflictException("This roll number is already registered", "ROLL_NUMBER_EXISTS");
        });

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setRollNumber(request.rollNumber().trim().toUpperCase());
        user.setDepartment(request.department().trim());
        user.setAcademicYear(request.academicYear());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.STUDENT);
        user.setStatus(UserStatus.ACTIVE);

        User saved = users.save(user);
        return issueTokens(saved, userAgent, ipAddress);
    }

    @Transactional
    public AuthResult login(LoginRequest request, String userAgent, String ipAddress) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = users.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password", "INVALID_CREDENTIALS"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BadRequestException("This account is not active", "ACCOUNT_INACTIVE");
        }

        user.setLastLogin(Instant.now());
        users.save(user);
        return issueTokens(user, userAgent, ipAddress);
    }

    @Transactional
    public AuthResult refresh(String rawToken, String userAgent, String ipAddress) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new UnauthorizedException("Refresh token is required", "REFRESH_TOKEN_REQUIRED");
        }

        io.jsonwebtoken.Claims claims;
        try {
            claims = jwtService.parseRefreshToken(rawToken);
        } catch (RuntimeException ex) {
            throw new UnauthorizedException("Refresh token is invalid or expired", "INVALID_REFRESH_TOKEN");
        }

        if (!"refresh".equals(claims.get("type", String.class)) || claims.getId() == null) {
            throw new UnauthorizedException("Invalid refresh token", "INVALID_REFRESH_TOKEN");
        }

        RefreshToken stored = refreshTokens.findByTokenId(claims.getId())
                .orElseThrow(() -> {
                    revokeAllForUser(claims.getSubject());
                    return new UnauthorizedException("Refresh token reuse detected", "TOKEN_REUSE");
                });

        String presentedHash = sha256(rawToken);
        if (!presentedHash.equals(stored.getTokenHash())) {
            revokeAllForUser(claims.getSubject());
            throw new UnauthorizedException("Refresh token reuse detected", "TOKEN_REUSE");
        }
        if (stored.getRevokedAt() != null || stored.getExpiresAt().isBefore(Instant.now())) {
            if (stored.getRevokedAt() != null) {
                revokeAllForUser(claims.getSubject());
            }
            throw new UnauthorizedException("Refresh token is no longer active", "INVALID_REFRESH_TOKEN");
        }

        User user = users.findById(claims.getSubject())
                .orElseThrow(() -> new UnauthorizedException("User is unavailable", "USER_UNAVAILABLE"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User is unavailable", "USER_UNAVAILABLE");
        }

        String replacementId = UUID.randomUUID().toString();
        stored.setRevokedAt(Instant.now());
        stored.setReplacedByTokenId(replacementId);
        refreshTokens.save(stored);
        return issueTokens(user, userAgent, ipAddress, replacementId);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        try {
            io.jsonwebtoken.Claims claims = jwtService.parseRefreshToken(rawToken);
            refreshTokens.findByTokenId(claims.getId()).ifPresentOrElse(token -> {
                token.setRevokedAt(Instant.now());
                refreshTokens.save(token);
            }, () -> refreshTokens.deleteByTokenId(claims.getId()));
        } catch (RuntimeException ignored) {
        }
    }

    @Transactional
    public void logoutAllDevices(String userId) {
        revokeAllForUser(userId);
        refreshTokens.deleteAllByUserId(userId);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect", "INVALID_CURRENT_PASSWORD");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setPasswordChangedAt(Instant.now());
        users.save(user);
        revokeAllForUser(userId);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        users.findByEmailIgnoreCase(request.email()).ifPresent(user -> {
            String resetToken = createOpaqueToken();
            user.setPasswordResetTokenHash(sha256(resetToken));
            user.setPasswordResetExpiresAt(Instant.now().plusSeconds(30 * 60));
            users.save(user);
            emailService.sendPasswordReset(user.getEmail(), resetToken, user.getPasswordResetExpiresAt());
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = sha256(request.token());
        User user = users.findAll().stream()
                .filter(candidate -> tokenHash.equals(candidate.getPasswordResetTokenHash()))
                .filter(candidate -> candidate.getPasswordResetExpiresAt() != null
                        && candidate.getPasswordResetExpiresAt().isAfter(Instant.now()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Reset token is invalid or expired", "INVALID_RESET_TOKEN"));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
        user.setPasswordChangedAt(Instant.now());
        users.save(user);
        revokeAllForUser(user.getId());
    }

    public AuthResult login(LoginRequest request) {
        return login(request, null, null);
    }

    public AuthResult register(RegisterRequest request) {
        return register(request, null, null);
    }

    public UserDto currentUserDto(String userId) {
        return toDto(users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND")));
    }

    public User ensureActiveUser(String userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User profile not found", "USER_NOT_FOUND"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User is unavailable", "USER_UNAVAILABLE");
        }
        return user;
    }

    private AuthResult issueTokens(User user, String userAgent, String ipAddress) {
        return issueTokens(user, userAgent, ipAddress, jwtService.newTokenId());
    }

    private AuthResult issueTokens(User user, String userAgent, String ipAddress, String tokenId) {
        String accessToken = jwtService.createAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtService.createRefreshToken(user.getId(), tokenId);

        RefreshToken token = new RefreshToken();
        token.setTokenId(tokenId);
        token.setTokenHash(sha256(refreshToken));
        token.setUserId(user.getId());
        token.setExpiresAt(Instant.now().plusSeconds(properties.jwt().refreshTtlDays() * 24L * 60L * 60L));
        token.setUserAgent(userAgent);
        token.setIpAddress(ipAddress);
        refreshTokens.save(token);

        return new AuthResult(toDto(user), accessToken, refreshToken);
    }

    private void revokeAllForUser(String userId) {
        refreshTokens.findAllByUserId(userId).forEach(token -> {
            token.setRevokedAt(Instant.now());
            refreshTokens.save(token);
        });
    }

    private void assertApprovedEmail(String email) {
        String lower = email.toLowerCase();
        String domain = lower.contains("@") ? lower.substring(lower.lastIndexOf('@') + 1) : "";
        if (!properties.approvedEmailDomains().contains(domain)) {
            throw new BadRequestException("Please use an approved college email address", "EMAIL_DOMAIN_NOT_APPROVED");
        }
    }

    private String createOpaqueToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash token", ex);
        }
    }

    private UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getFullName(),
                user.getRollNumber(),
                user.getDepartment(),
                user.getAcademicYear(),
                user.getEmail(),
                user.getProfilePicture(),
                user.getBio(),
                user.getInterests(),
                user.getRole(),
                user.getStatus(),
                user.getLastLogin(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

}
