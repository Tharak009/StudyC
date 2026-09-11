package com.studyconnect.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiter generalLimiter = new RateLimiter(60_000L, 100); // 100 reqs/min
    private final RateLimiter authLimiter = new RateLimiter(60_000L, 15);    // 15 reqs/min for auth

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String ip = clientIp(request);
        String uri = request.getRequestURI();

        boolean isAuthRoute = uri.startsWith("/api/auth/");
        RateLimiter activeLimiter = isAuthRoute ? authLimiter : generalLimiter;
        String key = (isAuthRoute ? "auth:" : "gen:") + ip;

        if (activeLimiter.isRateLimited(key)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                    {"success":false,"code":"TOO_MANY_REQUESTS","message":"Rate limit exceeded. Please try again later."}
                    """);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
