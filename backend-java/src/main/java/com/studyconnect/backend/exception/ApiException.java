package com.studyconnect.backend.exception;

import java.util.List;

public class ApiException extends RuntimeException {
    private final int status;
    private final String code;
    private final List<?> errors;

    public ApiException(int status, String message, String code) {
        this(status, message, code, List.of());
    }

    public ApiException(int status, String message, String code, List<?> errors) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public List<?> getErrors() {
        return errors;
    }
}
