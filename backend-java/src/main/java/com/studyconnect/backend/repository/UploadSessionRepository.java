package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.UploadSession;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UploadSessionRepository extends MongoRepository<UploadSession, String> {
    Optional<UploadSession> findByIdAndUserId(String id, String userId);
}
