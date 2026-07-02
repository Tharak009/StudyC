package com.studyconnect.backend.dto;

public record ApiResponse<T>(boolean success, T data, String message) {

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message);
    }
}
