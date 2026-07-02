package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.Message;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findAllByCommunityId(String communityId);

    List<Message> findAllBySenderId(String senderId);
}
