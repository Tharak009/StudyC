package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByRollNumberIgnoreCase(String rollNumber);

    List<User> findTop20ByFullNameContainingIgnoreCaseOrRollNumberContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String fullName, String rollNumber, String email);
}
