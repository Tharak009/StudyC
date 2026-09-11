package com.studyconnect.backend.util;

public final class SanitizationUtil {

    private SanitizationUtil() {}

    public static String sanitize(String value) {
        if (value == null) {
            return null;
        }
        // Remove leading $ or MongoDB query operator keys
        return value.replaceAll("^\\$+", "").replace("\0", "");
    }
}
