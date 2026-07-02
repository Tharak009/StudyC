package com.studyconnect.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public PasswordEncoder passwordEncoder(StudyConnectProperties properties) {
        return new BCryptPasswordEncoder(properties.bcryptRounds());
    }
}
