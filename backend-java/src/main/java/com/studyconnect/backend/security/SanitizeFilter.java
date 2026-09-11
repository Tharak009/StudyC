package com.studyconnect.backend.security;

import com.studyconnect.backend.util.SanitizationUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@Component
public class SanitizeFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        HttpServletRequest sanitizedRequest = new SanitizedRequestWrapper(request);
        filterChain.doFilter(sanitizedRequest, response);
    }

    private static class SanitizedRequestWrapper extends HttpServletRequestWrapper {
        private final Map<String, String[]> sanitizedParams = new HashMap<>();

        public SanitizedRequestWrapper(HttpServletRequest request) {
            super(request);
            Map<String, String[]> raw = request.getParameterMap();
            for (Map.Entry<String, String[]> entry : raw.entrySet()) {
                String cleanKey = SanitizationUtil.sanitize(entry.getKey());
                String[] rawValues = entry.getValue();
                if (rawValues != null) {
                    String[] cleanValues = new String[rawValues.length];
                    for (int i = 0; i < rawValues.length; i++) {
                        cleanValues[i] = SanitizationUtil.sanitize(rawValues[i]);
                    }
                    sanitizedParams.put(cleanKey, cleanValues);
                }
            }
        }

        @Override
        public String getParameter(String name) {
            String[] values = sanitizedParams.get(name);
            return (values != null && values.length > 0) ? values[0] : null;
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return Collections.unmodifiableMap(sanitizedParams);
        }

        @Override
        public Enumeration<String> getParameterNames() {
            return Collections.enumeration(sanitizedParams.keySet());
        }

        @Override
        public String[] getParameterValues(String name) {
            return sanitizedParams.get(name);
        }
    }
}
