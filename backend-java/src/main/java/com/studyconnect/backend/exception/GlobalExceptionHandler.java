package com.studyconnect.backend.exception;

import com.studyconnect.backend.dto.ApiResponse;
import com.studyconnect.backend.dto.ErrorResponse;
import com.studyconnect.backend.dto.FieldErrorDetail;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
        return ResponseEntity
                .status(exception.getStatus())
                .body(new ErrorResponse(
                        false,
                        exception.getMessage(),
                        exception.getCode(),
                        castErrors(exception.getErrors())
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        List<FieldErrorDetail> errors = exception.getBindingResult()
                .getAllErrors()
                .stream()
                .map(error -> toFieldError(error))
                .collect(Collectors.toList());
        return ResponseEntity.badRequest().body(new ErrorResponse(false, "Validation failed", "VALIDATION_ERROR", errors));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateKeyException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(false, "A unique field already exists", "DUPLICATE_VALUE", List.of()));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoHandlerFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(false, "Resource not found", "NOT_FOUND", List.of()));
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(org.springframework.security.core.AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(false, exception.getMessage(), "INVALID_CREDENTIALS", List.of()));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(org.springframework.security.access.AccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(false, "You do not have permission for this action", "FORBIDDEN", List.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, WebRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(false, "Unexpected server error", "INTERNAL_ERROR", List.of()));
    }

    private FieldErrorDetail toFieldError(FieldError fieldError) {
        return new FieldErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
    }

    private FieldErrorDetail toFieldError(ObjectError error) {
        if (error instanceof FieldError fieldError) {
            return toFieldError(fieldError);
        }
        return new FieldErrorDetail("body", error.getDefaultMessage());
    }

    private List<FieldErrorDetail> castErrors(List<?> errors) {
        return errors.stream()
                .filter(FieldErrorDetail.class::isInstance)
                .map(FieldErrorDetail.class::cast)
                .collect(Collectors.toList());
    }
}
