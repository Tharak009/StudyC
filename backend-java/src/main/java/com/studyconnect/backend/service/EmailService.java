package com.studyconnect.backend.service;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public void sendPasswordReset(String recipient, String resetToken, Instant expiresAt) {
        log.info("Password reset requested for {}. Token={} expiresAt={}", recipient, resetToken, expiresAt);
    }
}
