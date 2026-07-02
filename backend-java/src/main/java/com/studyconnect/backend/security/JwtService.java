package com.studyconnect.backend.security;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.entity.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final StudyConnectProperties properties;
    private final SecretKey accessKey;
    private final SecretKey refreshKey;

    public JwtService(StudyConnectProperties properties) {
        this.properties = properties;
        this.accessKey = key(properties.jwt().accessSecret());
        this.refreshKey = key(properties.jwt().refreshSecret());
    }

    public String createAccessToken(String userId, Role role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claims(Map.of("role", role.name(), "type", "access"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.jwt().accessTtl())))
                .signWith(accessKey)
                .compact();
    }

    public String createRefreshToken(String userId, String tokenId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .id(tokenId)
                .claims(Map.of("type", "refresh"))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(java.time.Duration.ofDays(properties.jwt().refreshTtlDays()))))
                .signWith(refreshKey)
                .compact();
    }

    public Claims parseAccessToken(String token) {
        Jws<Claims> claims = Jwts.parser().verifyWith(accessKey).build().parseSignedClaims(token);
        return claims.getPayload();
    }

    public Claims parseRefreshToken(String token) {
        Jws<Claims> claims = Jwts.parser().verifyWith(refreshKey).build().parseSignedClaims(token);
        return claims.getPayload();
    }

    public boolean isAccessToken(String token) {
        return "access".equals(parseAccessToken(token).get("type", String.class));
    }

    public boolean isRefreshToken(String token) {
        return "refresh".equals(parseRefreshToken(token).get("type", String.class));
    }

    private SecretKey key(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length >= 32) {
            return Keys.hmacShaKeyFor(bytes);
        }
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(secret.getBytes(StandardCharsets.UTF_8))
        ));
    }

    public String newTokenId() {
        return UUID.randomUUID().toString();
    }
}
