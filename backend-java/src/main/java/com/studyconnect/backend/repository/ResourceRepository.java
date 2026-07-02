package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.Resource;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ResourceRepository extends MongoRepository<Resource, String> {
    List<Resource> findAllByCommunityId(String communityId);

    List<Resource> findAllByUploadedBy(String uploadedBy);
}
