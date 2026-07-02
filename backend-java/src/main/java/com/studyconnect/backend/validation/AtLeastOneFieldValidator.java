package com.studyconnect.backend.validation;

import com.studyconnect.backend.dto.user.UserProfileUpdateRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class AtLeastOneFieldValidator implements ConstraintValidator<AtLeastOneField, UserProfileUpdateRequest> {

    @Override
    public boolean isValid(UserProfileUpdateRequest value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        return value.fullName() != null
                || value.department() != null
                || value.academicYear() != null
                || value.bio() != null
                || value.interests() != null;
    }
}
