package com.studyconnect.backend.exception;

public class ConflictException extends ApiException {
    public ConflictException(String message, String code) {
        super(409, message, code);
    }
}
