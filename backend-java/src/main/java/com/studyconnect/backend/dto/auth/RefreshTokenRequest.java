package com.studyconnect.backend.dto.auth;

public record RefreshTokenRequest(String refreshToken, Boolean allDevices) {
}
