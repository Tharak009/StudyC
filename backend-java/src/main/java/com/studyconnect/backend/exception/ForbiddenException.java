package com.studyconnect.backend.exception;

public class ForbiddenException extends ApiException {
    public ForbiddenException(String message, String code) {
        super(403, message, code);
    }
}
