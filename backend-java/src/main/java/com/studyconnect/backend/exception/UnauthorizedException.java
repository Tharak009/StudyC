package com.studyconnect.backend.exception;

public class UnauthorizedException extends ApiException {
    public UnauthorizedException(String message, String code) {
        super(401, message, code);
    }
}
