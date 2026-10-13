package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.entity.UploadSession;
import com.studyconnect.backend.exception.BadRequestException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileStorageServiceTest {

    @TempDir
    Path tempFolder;

    private StudyConnectProperties properties;
    private FileStorageService storageService;

    @BeforeEach
    void setUp() {
        properties = new StudyConnectProperties(
                "http://localhost:5173",
                List.of("college.edu"),
                new StudyConnectProperties.Jwt("access-secret-12345678901234567890", "refresh-secret-12345678901234567890", java.time.Duration.ofMinutes(15), 7),
                12,
                tempFolder.toString(),
                false,
                "AUTO",
                null // Cloud S3 disabled -> Local storage mode
        );
        storageService = new FileStorageService(properties);
    }

    @Test
    void isCloudStorageActiveReturnsFalseWhenS3NotConfigured() {
        assertThat(storageService.isCloudStorageActive()).isFalse();
    }

    @Test
    void throwsExceptionWhenCloudModeRequestedWithoutCredentials() {
        StudyConnectProperties cloudProp = new StudyConnectProperties(
                "http://localhost:5173",
                List.of("college.edu"),
                new StudyConnectProperties.Jwt("access-secret-12345678901234567890", "refresh-secret-12345678901234567890", java.time.Duration.ofMinutes(15), 7),
                12,
                tempFolder.toString(),
                false,
                "CLOUD",
                null
        );

        assertThrows(IllegalStateException.class, () -> new FileStorageService(cloudProp));
    }

    @Test
    void localPartUploadAndCompletionMergesFilesCorrectly() throws IOException {
        String uploadId = "session-test-123";
        String key = "resources/test-doc.pdf";

        byte[] part1Data = "Chunk 1 Data - ".getBytes();
        byte[] part2Data = "Chunk 2 Data".getBytes();

        String etag1 = storageService.saveLocalPart(uploadId, 1, new ByteArrayInputStream(part1Data));
        String etag2 = storageService.saveLocalPart(uploadId, 2, new ByteArrayInputStream(part2Data));

        assertThat(etag1).contains("etag-local-part-1");
        assertThat(etag2).contains("etag-local-part-2");

        List<UploadSession.PartInfo> completedParts = List.of(
                new UploadSession.PartInfo(1, etag1),
                new UploadSession.PartInfo(2, etag2)
        );

        String fileUrl = storageService.completeMultipartUpload(key, uploadId, completedParts);
        assertThat(fileUrl).isEqualTo("/uploads/resources/test-doc.pdf");

        Path finalFile = tempFolder.resolve(key);
        assertThat(Files.exists(finalFile)).isTrue();
        assertThat(Files.readAllBytes(finalFile)).isEqualTo("Chunk 1 Data - Chunk 2 Data".getBytes());
    }

    @Test
    void cloudStorageActiveInitializesWithR2Credentials() {
        StudyConnectProperties r2Properties = new StudyConnectProperties(
                "http://localhost:5173",
                List.of("college.edu"),
                new StudyConnectProperties.Jwt("access-secret-12345678901234567890", "refresh-secret-12345678901234567890", java.time.Duration.ofMinutes(15), 7),
                12,
                tempFolder.toString(),
                false,
                "CLOUD",
                new StudyConnectProperties.S3(
                        "my-r2-bucket",
                        "auto",
                        "https://example-account.r2.cloudflarestorage.com",
                        "mock-access-key-123",
                        "mock-secret-key-456"
                )
        );

        FileStorageService r2Service = new FileStorageService(r2Properties);
        assertThat(r2Service.isCloudStorageActive()).isTrue();

        String presignedDownloadUrl = r2Service.generatePresignedDownloadUrl(
                "https://example-account.r2.cloudflarestorage.com/my-r2-bucket/resources/sample.pdf",
                "sample.pdf"
        );

        assertThat(presignedDownloadUrl).contains("example-account.r2.cloudflarestorage.com");
        assertThat(presignedDownloadUrl).contains("X-Amz-Signature");
    }

    @Test
    void abortMultipartUploadCleansUpLocalTempSession() {
        String uploadId = "session-abort-123";
        storageService.saveLocalPart(uploadId, 1, new ByteArrayInputStream("data".getBytes()));

        Path tempDir = tempFolder.resolve("temp-sessions").resolve(uploadId);
        assertThat(Files.exists(tempDir)).isTrue();

        storageService.abortMultipartUpload("resources/aborted.pdf", uploadId);
        assertThat(Files.exists(tempDir)).isFalse();
    }
}
