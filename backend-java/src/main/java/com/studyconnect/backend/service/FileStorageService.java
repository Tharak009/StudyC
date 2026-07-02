package com.studyconnect.backend.service;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.exception.BadRequestException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path root;

    public FileStorageService(StudyConnectProperties properties) {
        this.root = Paths.get(properties.uploadDir()).toAbsolutePath().normalize();
    }

    public StoredFile store(MultipartFile file, String subdirectory, Set<String> allowedMimeTypes, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required", "FILE_REQUIRED");
        }
        if (file.getSize() > maxBytes) {
            throw new BadRequestException("File exceeds the allowed size", "FILE_TOO_LARGE");
        }
        String contentType = file.getContentType();
        if (contentType == null || !allowedMimeTypes.contains(contentType)) {
            throw new BadRequestException("Unsupported file type", "INVALID_FILE_TYPE");
        }

        try {
            Files.createDirectories(root.resolve(subdirectory));
            String extension = extensionOf(file.getOriginalFilename());
            String key = subdirectory + "/" + UUID.randomUUID() + extension;
            Path destination = root.resolve(key).normalize();
            Files.copy(file.getInputStream(), destination);
            return new StoredFile(
                    key.replace('\\', '/'),
                    "/uploads/" + key.replace('\\', '/'),
                    file.getOriginalFilename() == null ? key : file.getOriginalFilename(),
                    contentType,
                    file.getSize(),
                    Instant.now()
            );
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store uploaded file", "FILE_UPLOAD_FAILED");
        }
    }

    public void deleteByKey(String key) {
        try {
            Path path = root.resolve(key).normalize();
            if (path.startsWith(root)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
            // Best-effort cleanup.
        }
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int index = filename.lastIndexOf('.');
        return index >= 0 ? filename.substring(index).toLowerCase() : "";
    }

    public record StoredFile(String key, String url, String originalName, String mimeType, long size, Instant storedAt) {
    }
}
