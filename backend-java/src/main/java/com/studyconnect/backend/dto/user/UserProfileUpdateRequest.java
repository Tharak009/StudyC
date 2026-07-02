package com.studyconnect.backend.dto.user;

import com.studyconnect.backend.validation.AtLeastOneField;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@AtLeastOneField
public record UserProfileUpdateRequest(
        @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
        String fullName,

        @Size(min = 2, max = 100, message = "Department must be between 2 and 100 characters")
        String department,

        @Min(value = 1, message = "Academic year must be at least 1")
        @Max(value = 8, message = "Academic year must be at most 8")
        Integer academicYear,

        @Size(max = 500, message = "Bio must be at most 500 characters")
        String bio,

        @Size(max = 20, message = "A maximum of 20 interests is allowed")
        List<@Size(min = 1, max = 50, message = "Each interest must be between 1 and 50 characters") String> interests) {

    public UserProfileUpdateRequest {
        fullName = normalize(fullName);
        department = normalize(department);
        bio = normalize(bio);
        if (interests != null) {
            interests = List.copyOf(new ArrayList<>(new LinkedHashSet<>(
                    interests.stream()
                            .map(UserProfileUpdateRequest::normalize)
                            .toList()
            )));
        }
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
