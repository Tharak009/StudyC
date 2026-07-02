package com.studyconnect.backend.exception;

public class BadRequestException extends ApiException {
    public BadRequestException(String message, String code) {
        super(400, message, code);
    }
}
