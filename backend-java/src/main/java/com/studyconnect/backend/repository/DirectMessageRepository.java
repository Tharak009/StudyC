package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.DirectMessage;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DirectMessageRepository extends MongoRepository<DirectMessage, String> {
    List<DirectMessage> findAllByConversationId(String conversationId);

    List<DirectMessage> findAllBySenderId(String senderId);

    long countByConversationIdAndReadFalseAndSenderIdNot(String conversationId, String senderId);
}
