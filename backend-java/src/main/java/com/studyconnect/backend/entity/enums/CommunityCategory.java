package com.studyconnect.backend.entity.enums;

import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.annotation.JsonCreator;

public enum CommunityCategory {
    JAVA_PROGRAMMING("Java Programming"),
    PYTHON_PROGRAMMING("Python Programming"),
    WEB_DEVELOPMENT("Web Development"),
    CYBER_SECURITY("Cyber Security"),
    DATA_SCIENCE("Data Science"),
    COMPETITIVE_PROGRAMMING("Competitive Programming"),
    PLACEMENT_PREPARATION("Placement Preparation"),
    OTHER("Other");

    private final String value;

    CommunityCategory(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static CommunityCategory fromValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        for (CommunityCategory category : values()) {
            if (category.value.equalsIgnoreCase(normalized) || category.name().equalsIgnoreCase(normalized)) {
                return category;
            }
        }
        throw new IllegalArgumentException("Unknown community category: " + value);
    }
}
