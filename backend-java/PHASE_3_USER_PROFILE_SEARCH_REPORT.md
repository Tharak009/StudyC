# StudyConnect Backend Phase 3 Report

## Scope

This phase migrates only user profile read/update, profile-picture upload, and user search from the Express backend to Spring Boot.

## APIs Migrated

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `POST /api/users/profile-picture`
- `GET /api/users/search?q=...`

## Files Created

- [`backend-java/src/main/java/com/studyconnect/backend/dto/user/UserProfileUpdateRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/user/UserProfileUpdateRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneField.java`](backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneField.java)
- [`backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneFieldValidator.java`](backend-java/src/main/java/com/studyconnect/backend/validation/AtLeastOneFieldValidator.java)
- [`backend-java/src/test/java/com/studyconnect/backend/controller/UserControllerTest.java`](backend-java/src/test/java/com/studyconnect/backend/controller/UserControllerTest.java)
- [`backend-java/src/test/java/com/studyconnect/backend/service/UserServiceTest.java`](backend-java/src/test/java/com/studyconnect/backend/service/UserServiceTest.java)

## Files Modified

- [`backend-java/src/main/java/com/studyconnect/backend/controller/UserController.java`](backend-java/src/main/java/com/studyconnect/backend/controller/UserController.java)
- [`backend-java/src/main/java/com/studyconnect/backend/service/UserService.java`](backend-java/src/main/java/com/studyconnect/backend/service/UserService.java)
- [`backend-java/src/main/java/com/studyconnect/backend/exception/GlobalExceptionHandler.java`](backend-java/src/main/java/com/studyconnect/backend/exception/GlobalExceptionHandler.java)
- [`backend-java/pom.xml`](backend-java/pom.xml)

## Phase 3 Behavior

- Profile retrieval returns the current authenticated user profile.
- Profile updates trim incoming text fields and deduplicate interests.
- Empty profile updates are rejected through Bean Validation.
- Profile picture uploads accept the `profilePicture` multipart field.
- Previous profile images are removed after a successful replacement upload.
- User search returns an empty array for short queries and excludes the current user.

## Verification

- `mvn -q test`: passing
- MongoDB schema remains unchanged
- React frontend untouched
- React Native project untouched

## Ready For Phase 4

- Yes
- The next phase can migrate Communities without reworking the auth or user profile foundation
