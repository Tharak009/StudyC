package com.studyconnect.backend.validation;

import com.studyconnect.backend.dto.community.CommunityUpdateRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class AtLeastOneCommunityFieldValidator implements ConstraintValidator<AtLeastOneCommunityField, CommunityUpdateRequest> {

    @Override
    public boolean isValid(CommunityUpdateRequest value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        return value.name() != null
                || value.description() != null
                || value.category() != null
                || value.tags() != null
                || value.visibility() != null
                || value.bannerImage() != null;
    }
}
