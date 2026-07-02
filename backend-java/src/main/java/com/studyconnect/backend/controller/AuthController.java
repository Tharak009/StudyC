package com.studyconnect.backend.controller;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.auth.ChangePasswordRequest;
import com.studyconnect.backend.dto.auth.ForgotPasswordRequest;
import com.studyconnect.backend.dto.auth.LoginRequest;
import com.studyconnect.backend.dto.auth.RefreshTokenRequest;
import com.studyconnect.backend.dto.auth.RegisterRequest;
import com.studyconnect.backend.dto.auth.ResetPasswordRequest;
import com.studyconnect.backend.dto.auth.AuthResult;
import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.service.AuthService;
import com.studyconnect.backend.util.SecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "studyconnect_refresh";

    private final AuthService authService;
    private final StudyConnectProperties properties;
    private final Environment environment;

    public AuthController(AuthService authService, StudyConnectProperties properties, Environment environment) {
        this.authService = authService;
        this.properties = properties;
        this.environment = environment;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResult>> register(
            @Valid @RequestBody RegisterRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @RequestHeader(value = "x-client-platform", required = false) String clientPlatform,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        AuthResult authResult = authService.register(request, userAgent, servletRequest.getRemoteAddr());
        attachRefreshCookie(response, authResult.refreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(maybeStripRefresh(authResult, clientPlatform), "Account created successfully"));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResult> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @RequestHeader(value = "x-client-platform", required = false) String clientPlatform,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        AuthResult authResult = authService.login(request, userAgent, servletRequest.getRemoteAddr());
        attachRefreshCookie(response, authResult.refreshToken());
        return ApiResponse.success(maybeStripRefresh(authResult, clientPlatform), "Signed in successfully");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @RequestBody(required = false) RefreshTokenRequest body,
            jakarta.servlet.http.HttpServletRequest request,
            org.springframework.security.core.Authentication authentication,
            HttpServletResponse response) {
        String refreshToken = body != null ? body.refreshToken() : extractRefreshToken(request);
        boolean allDevices = body != null && Boolean.TRUE.equals(body.allDevices());
        if (allDevices && authentication != null && authentication.isAuthenticated()) {
            authService.logoutAllDevices(SecurityUtil.currentUserId(authentication));
        } else {
            authService.logout(refreshToken);
        }
        clearRefreshCookie(response);
        return ApiResponse.success(null, "Signed out successfully");
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthResult> refresh(
            @RequestBody(required = false) RefreshTokenRequest body,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @RequestHeader(value = "x-client-platform", required = false) String clientPlatform,
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = body != null ? body.refreshToken() : null;
        if (refreshToken == null) {
            refreshToken = extractRefreshToken(request);
        }
        AuthResult authResult = authService.refresh(refreshToken, userAgent, request.getRemoteAddr());
        attachRefreshCookie(response, authResult.refreshToken());
        return ApiResponse.success(maybeStripRefresh(authResult, clientPlatform), "Token refreshed");
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            org.springframework.security.core.Authentication authentication,
            HttpServletResponse response) {
        authService.changePassword(SecurityUtil.currentUserId(authentication), request);
        clearRefreshCookie(response);
        return ApiResponse.success(null, "Password changed. Please sign in again.");
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.success(null, "If an account exists, password reset instructions have been sent.");
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletResponse response) {
        authService.resetPassword(request);
        clearRefreshCookie(response);
        return ApiResponse.success(null, "Password reset successfully");
    }

    private AuthResult maybeStripRefresh(AuthResult authResult, String clientPlatform) {
        boolean mobile = "mobile".equalsIgnoreCase(clientPlatform);
        return mobile ? authResult : new AuthResult(authResult.user(), authResult.accessToken(), null);
    }

    private void attachRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .path("/api/auth")
                .sameSite(isProduction() ? "Strict" : "Lax")
                .maxAge(Duration.ofDays(properties.jwt().refreshTtlDays()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .path("/api/auth")
                .sameSite(isProduction() ? "Strict" : "Lax")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private boolean isProduction() {
        return environment != null && java.util.Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "production".equalsIgnoreCase(profile) || "prod".equalsIgnoreCase(profile));
    }

    private String extractRefreshToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if (REFRESH_COOKIE.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
