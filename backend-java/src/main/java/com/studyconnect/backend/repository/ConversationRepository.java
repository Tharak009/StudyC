package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.Conversation;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConversationRepository extends MongoRepository<Conversation, String> {
    List<Conversation> findAllByParticipantsContains(String userId);
}
