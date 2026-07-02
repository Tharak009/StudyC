package com.studyconnect.backend.util;

import com.studyconnect.backend.security.UserPrincipal;
import org.springframework.security.core.Authentication;

public final class SecurityUtil {

    private SecurityUtil() {
    }

    public static String currentUserId(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.id();
        }
        return authentication.getName();
    }
}
