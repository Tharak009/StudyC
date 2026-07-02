package com.studyconnect.backend.exception;

public class UnprocessableEntityException extends ApiException {
    public UnprocessableEntityException(String message, String code) {
        super(422, message, code);
    }
}
