package com.studyconnect.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.studyconnect.backend.entity.enums.Role;
import com.studyconnect.backend.entity.enums.UserStatus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    @MongoId(FieldType.OBJECT_ID)
    @JsonProperty("_id")
    private String id;

    private String fullName;

    @Indexed(unique = true)
    private String rollNumber;

    private String department;
    private Integer academicYear;

    @Indexed(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    private String profilePicture;
    private String bio = "";
    private List<String> interests = new ArrayList<>();
    private Role role = Role.STUDENT;
    private UserStatus status = UserStatus.ACTIVE;
    private Instant lastLogin;

    @JsonIgnore
    private String passwordResetTokenHash;

    @JsonIgnore
    private Instant passwordResetExpiresAt;

    private Instant passwordChangedAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
