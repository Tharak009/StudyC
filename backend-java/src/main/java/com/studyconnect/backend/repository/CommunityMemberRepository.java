package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.CommunityMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommunityMemberRepository extends MongoRepository<CommunityMember, String> {
    Optional<CommunityMember> findByCommunityIdAndUserId(String communityId, String userId);

    List<CommunityMember> findAllByCommunityId(String communityId);

    List<CommunityMember> findAllByUserId(String userId);

    long countByCommunityId(String communityId);

    void deleteByCommunityIdAndUserId(String communityId, String userId);

    void deleteAllByCommunityId(String communityId);
}
