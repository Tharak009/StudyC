package com.studyconnect.backend;

import com.studyconnect.backend.config.StudyConnectProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(StudyConnectProperties.class)
public class StudyConnectApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyConnectApplication.class, args);
    }
}
