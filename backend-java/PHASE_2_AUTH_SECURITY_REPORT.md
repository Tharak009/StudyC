# StudyConnect Backend Phase 2 Report

## Scope

This phase migrates only the authentication and security layer from the Express backend to Spring Boot.

## APIs Migrated

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Files Created

- [`backend-java/pom.xml`](backend-java/pom.xml)
- [`backend-java/src/main/resources/application.yml`](backend-java/src/main/resources/application.yml)
- [`backend-java/src/main/resources/application-dev.yml`](backend-java/src/main/resources/application-dev.yml)
- [`backend-java/src/main/resources/application-prod.yml`](backend-java/src/main/resources/application-prod.yml)
- [`backend-java/src/main/resources/logback-spring.xml`](backend-java/src/main/resources/logback-spring.xml)
- [`backend-java/src/main/java/com/studyconnect/backend/controller/AuthController.java`](backend-java/src/main/java/com/studyconnect/backend/controller/AuthController.java)
- [`backend-java/src/main/java/com/studyconnect/backend/exception/GlobalExceptionHandler.java`](backend-java/src/main/java/com/studyconnect/backend/exception/GlobalExceptionHandler.java)
- [`backend-java/src/main/java/com/studyconnect/backend/security/SecurityConfig.java`](backend-java/src/main/java/com/studyconnect/backend/security/SecurityConfig.java)
- [`backend-java/src/main/java/com/studyconnect/backend/security/JwtAuthenticationFilter.java`](backend-java/src/main/java/com/studyconnect/backend/security/JwtAuthenticationFilter.java)
- [`backend-java/src/main/java/com/studyconnect/backend/security/JwtService.java`](backend-java/src/main/java/com/studyconnect/backend/security/JwtService.java)
- [`backend-java/src/main/java/com/studyconnect/backend/service/AuthService.java`](backend-java/src/main/java/com/studyconnect/backend/service/AuthService.java)
- [`backend-java/src/main/java/com/studyconnect/backend/repository/RefreshTokenRepository.java`](backend-java/src/main/java/com/studyconnect/backend/repository/RefreshTokenRepository.java)
- [`backend-java/src/main/java/com/studyconnect/backend/entity/RefreshToken.java`](backend-java/src/main/java/com/studyconnect/backend/entity/RefreshToken.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/AuthResult.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/AuthResult.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/RegisterRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/RegisterRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/LoginRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/LoginRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/RefreshTokenRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/RefreshTokenRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/ChangePasswordRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/ChangePasswordRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/ForgotPasswordRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/ForgotPasswordRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/auth/ResetPasswordRequest.java`](backend-java/src/main/java/com/studyconnect/backend/dto/auth/ResetPasswordRequest.java)
- [`backend-java/src/main/java/com/studyconnect/backend/dto/user/UserDto.java`](backend-java/src/main/java/com/studyconnect/backend/dto/user/UserDto.java)

## Files Modified

- [`backend-java/src/main/java/com/studyconnect/backend/controller/AuthController.java`](backend-java/src/main/java/com/studyconnect/backend/controller/AuthController.java)
- [`backend-java/src/main/java/com/studyconnect/backend/service/AuthService.java`](backend-java/src/main/java/com/studyconnect/backend/service/AuthService.java)
- [`backend-java/src/main/java/com/studyconnect/backend/security/SecurityConfig.java`](backend-java/src/main/java/com/studyconnect/backend/security/SecurityConfig.java)
- [`backend-java/src/main/java/com/studyconnect/backend/security/JwtService.java`](backend-java/src/main/java/com/studyconnect/backend/security/JwtService.java)
- [`backend-java/src/main/java/com/studyconnect/backend/security/JwtAuthenticationFilter.java`](backend-java/src/main/java/com/studyconnect/backend/security/JwtAuthenticationFilter.java)
- [`backend-java/src/main/java/com/studyconnect/backend/exception/GlobalExceptionHandler.java`](backend-java/src/main/java/com/studyconnect/backend/exception/GlobalExceptionHandler.java)

## Security Configuration Summary

- Stateless Spring Security configuration
- JWT access-token filter for protected endpoints
- `DaoAuthenticationProvider` wired to Mongo-backed users
- BCrypt password hashing
- CORS enabled for frontend origins
- Authentication entry point returns JSON error envelopes
- Access denied handler returns JSON error envelopes
- Mongo refresh tokens stored and rotated on refresh

## JWT Flow

1. Register or login authenticates the user and issues:
   - short-lived access token
   - rotating refresh token stored in MongoDB
2. Web clients receive the refresh token via `httpOnly` cookie.
3. Mobile clients can send `x-client-platform: mobile` and receive the refresh token in the JSON body as well.
4. Refresh token requests validate the stored MongoDB token, rotate it, and issue a new access token.
5. Logout revokes the current refresh token, while optional full-device logout revokes all refresh tokens for the authenticated user.
6. Password changes and password resets revoke existing refresh tokens.

## Validation Covered

- Email format
- Password strength
- Required fields
- College email domain restriction
- Bean Validation request binding

## Remaining Work for Phase 3

- Do not begin Phase 3 automatically
- The next phase should migrate the first non-auth module only after this auth layer is fully accepted
- No user profile, communities, chat, notifications, resources, or admin migration is included in this phase

## Verification

- Spring Boot Maven compile: passing
- MongoDB connectivity: passing
- Mobile app unchanged: confirmed
