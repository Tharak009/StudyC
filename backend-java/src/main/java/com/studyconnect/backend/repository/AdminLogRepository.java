package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.AdminLog;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminLogRepository extends MongoRepository<AdminLog, String> {
    List<AdminLog> findTop10ByOrderByCreatedAtDesc();
}
