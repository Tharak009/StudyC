package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.Notification;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findAllByUserId(String userId);

    long countByUserIdAndIsReadFalse(String userId);
}
