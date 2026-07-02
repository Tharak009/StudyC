package com.studyconnect.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 100) String fullName,
        @NotBlank @Size(min = 2, max = 30) String rollNumber,
        @NotBlank @Size(min = 2, max = 100) String department,
        @NotNull @Min(1) @Max(8) Integer academicYear,
        @Email @NotBlank String email,
        @NotBlank
        @Size(min = 8, max = 128)
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$", message = "Password must contain a lowercase letter, an uppercase letter, and a number")
        String password) {
}
