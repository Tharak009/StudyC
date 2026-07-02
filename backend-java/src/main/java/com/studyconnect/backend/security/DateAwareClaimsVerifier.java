package com.studyconnect.backend.security;

import io.jsonwebtoken.Claims;
import java.time.Instant;

final class DateAwareClaimsVerifier {

    private DateAwareClaimsVerifier() {
    }

    static void verifyPasswordStaleness(Claims claims, Instant passwordChangedAt) {
        if (passwordChangedAt == null) {
            return;
        }
        Instant issuedAt = claims.getIssuedAt() == null ? null : claims.getIssuedAt().toInstant();
        if (issuedAt != null && passwordChangedAt.isAfter(issuedAt)) {
            throw new com.studyconnect.backend.exception.UnauthorizedException(
                    "Password changed after this token was issued",
                    "TOKEN_STALE"
            );
        }
    }
}
