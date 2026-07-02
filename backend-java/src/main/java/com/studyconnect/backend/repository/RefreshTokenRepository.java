package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.RefreshToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RefreshTokenRepository extends MongoRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenId(String tokenId);

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findAllByUserId(String userId);

    void deleteAllByUserId(String userId);

    void deleteByTokenId(String tokenId);
}
