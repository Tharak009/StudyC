package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.Community;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommunityRepository extends MongoRepository<Community, String> {
    Optional<Community> findByNameIgnoreCase(String name);

    Optional<Community> findBySlugIgnoreCase(String slug);
}
