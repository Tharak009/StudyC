package com.studyconnect.backend.dto;

import java.util.List;

public record ErrorResponse(boolean success, String message, String code, List<FieldErrorDetail> errors) {
}
