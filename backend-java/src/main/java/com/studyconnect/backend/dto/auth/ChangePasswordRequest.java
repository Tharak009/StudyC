package com.studyconnect.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record ChangePasswordRequest(
        @NotBlank @Size(min = 1, max = 128) String currentPassword,
        @NotBlank
        @Size(min = 8, max = 128)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$", message = "Password must contain a lowercase letter, an uppercase letter, and a number")
        String newPassword) {
}
