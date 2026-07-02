package com.studyconnect.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = AtLeastOneFieldValidator.class)
public @interface AtLeastOneField {
    String message() default "At least one profile field is required";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
