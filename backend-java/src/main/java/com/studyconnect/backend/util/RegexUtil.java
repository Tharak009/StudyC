package com.studyconnect.backend.util;

import java.util.regex.Pattern;

public final class RegexUtil {

    private static final Pattern SPECIAL_CHARS = Pattern.compile("[.*+?^${}()|\\[\\]\\\\]");

    private RegexUtil() {}

    public static String escapeRegExp(String value) {
        if (value == null) {
            return "";
        }
        return SPECIAL_CHARS.matcher(value).replaceAll("\\\\$0");
    }
}
