package com.studyconnect.backend.dto.community;

import jakarta.validation.constraints.NotBlank;

public record ModeratorRequest(@NotBlank String userId) {
}
