package com.studyconnect.backend.dto.auth;

import com.studyconnect.backend.dto.user.UserDto;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthResult(UserDto user, String accessToken, String refreshToken) {
}
