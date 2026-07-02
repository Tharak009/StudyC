package com.studyconnect.backend.exception;

public class NotFoundException extends ApiException {
    public NotFoundException(String message, String code) {
        super(404, message, code);
    }
}
