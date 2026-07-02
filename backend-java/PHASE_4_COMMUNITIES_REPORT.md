# StudyConnect Backend Phase 4 Report

## Scope

This phase migrates the Communities module from the Express backend to Spring Boot while preserving the existing `/api/communities/*` API shape for the web and mobile clients.

## APIs Migrated

- `POST /api/communities`
- `GET /api/communities`
- `GET /api/communities/:id`
- `PUT /api/communities/:id`
- `DELETE /api/communities/:id`
- `POST /api/communities/:id/join`
- `POST /api/communities/:id/leave`
- `GET /api/communities/:id/members`
- `POST /api/communities/:id/moderators`
- `DELETE /api/communities/:id/moderators/:userId`
- `DELETE /api/communities/:id/members/:userId`

## Files Created

- [`backend-java/src/main/java/com/studyconnect/backend/controller/CommunityController.java`](backend-java/src/main/java/com/studyconnect/backend/controller/CommunityController.java)
- [`backend-java/src/main/java/com/studyconnect/backend/service/CommunityService.java`](backend-java/src/main/java/com/studyconnect/backend/service/CommunityService.java)
- [`backend-java/src/main/java/com/studyconnect/backend/mapper/CommunityMapper.java`](backend-java/src/main/java/com/studyconnect/backend/mapper/CommunityMapper.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityCreateRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityCreateRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityUpdateRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityUpdateRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityPageDto.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityPageDto.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityDto.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityDto.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityMemberDto.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityMemberDto.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityUserDto.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityUserDto.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityExtensionPointsDto.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/CommunityExtensionPointsDto.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/community/ModeratorRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/community/ModeratorRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneCommunityField.java`](backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneCommunityField.java)
- [`backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneCommunityFieldValidator.java`](backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneCommunityFieldValidator.java)
- [`backend-java/src/test/java/com/studyconnect/backend/controller/CommunityControllerTest.java`](backend-java/src/test/java/com/studyconnect/backend/controller/CommunityControllerTest.java)
- [`backend-java/src/test/java/com/studyconnect/backend/service/CommunityServiceTest.java`](backend-java/src/test/java/com/studyconnect/backend/service/CommunityServiceTest.java)

## Files Modified

- [`backend-java/src/main/java/com/studyconnect/backend/entity/enums/CommunityCategory.java`](backend-java/src/main/java/com/studyconnect/backend/entity/enums/CommunityCategory.java)
- [`backend-java/src/main/java/com/studyconnect/backend/entity/enums/CommunityVisibility.java`](backend-java/src/main/java/com/studyconnect/backend/entity/enums/CommunityVisibility.java)
- [`backend-java/src/main/java/com/studyconnect/backend/controller/CommunityController.java`](backend-java/src/main/java/com/studyconnect/backend/controller/CommunityController.java)
- [`backend-java/src/main/java/com/studyconnect/backend/service/CommunityService.java`](backend-java/src/main/java/com/studyconnect/backend/service/CommunityService.java)

## Behavior Preserved

- Public and private community visibility
- Community create/update/delete
- Join and leave semantics
- Owner and moderator permissions
- Member listing and moderator management
- Banner upload with replacement cleanup
- List pagination and search behavior
- Response shape with `membershipRole` and `isMember`

## Verification

- `mvn -q test`: passing
- MongoDB schema unchanged
- React frontend untouched
- React Native project untouched

## Ready For Phase 5

- Yes
- Next step is Community Chat and realtime messaging
