package com.studyconnect.backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonCreator;

public enum CommunityVisibility {
    PUBLIC("public"),
    PRIVATE("private");

    private final String value;

    CommunityVisibility(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static CommunityVisibility fromValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        for (CommunityVisibility visibility : values()) {
            if (visibility.value.equalsIgnoreCase(normalized) || visibility.name().equalsIgnoreCase(normalized)) {
                return visibility;
            }
        }
        throw new IllegalArgumentException("Unknown community visibility: " + value);
    }
}
