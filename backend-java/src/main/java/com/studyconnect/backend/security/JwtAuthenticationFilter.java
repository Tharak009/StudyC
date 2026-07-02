package com.studyconnect.backend.security;

import com.studyconnect.backend.entity.User;
import com.studyconnect.backend.entity.enums.UserStatus;
import com.studyconnect.backend.exception.UnauthorizedException;
import com.studyconnect.backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/health") || path.startsWith("/actuator") || path.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        try {
            Claims claims = jwtService.parseAccessToken(token);
            if (!"access".equals(claims.get("type", String.class))) {
                throw new UnauthorizedException("Access token is invalid or expired", "INVALID_ACCESS_TOKEN");
            }

            String userId = claims.getSubject();
            User user = users.findById(userId)
                    .orElseThrow(() -> new UnauthorizedException("User is unavailable", "USER_UNAVAILABLE"));
            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new UnauthorizedException("User is unavailable", "USER_UNAVAILABLE");
            }
            Instant passwordChangedAt = user.getPasswordChangedAt();
            DateAwareClaimsVerifier.verifyPasswordStaleness(claims, passwordChangedAt);

            var authentication = new UsernamePasswordAuthenticationToken(
                    new UserPrincipal(user.getId(), user.getEmail(), user.getRole(), user.getPassword()),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (RuntimeException ex) {
            SecurityContextHolder.clearContext();
            if (ex instanceof UnauthorizedException unauthorizedException) {
                throw unauthorizedException;
            }
            throw new UnauthorizedException("Access token is invalid or expired", "INVALID_ACCESS_TOKEN");
        }

        filterChain.doFilter(request, response);
    }
}
