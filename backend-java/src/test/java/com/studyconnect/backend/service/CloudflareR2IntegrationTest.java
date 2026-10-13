package com.studyconnect.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.entity.UploadSession;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

@EnabledIfEnvironmentVariable(named = "RUN_R2_INTEGRATION_TESTS", matches = "true")
class CloudflareR2IntegrationTest {

    @Test
    void executeRealCloudflareR2MultipartLifecycle() throws Exception {
        String bucket = System.getenv("S3_BUCKET");
        String accessKey = System.getenv("S3_ACCESS_KEY");
        String secretKey = System.getenv("S3_SECRET_KEY");
        String endpoint = System.getenv("S3_ENDPOINT");
        String region = System.getenv("S3_REGION");

        assertThat(bucket).isNotNull().isNotBlank();
        assertThat(accessKey).isNotNull().isNotBlank();
        assertThat(secretKey).isNotNull().isNotBlank();

        StudyConnectProperties properties = new StudyConnectProperties(
                "http://localhost:5173",
                List.of("college.edu"),
                new StudyConnectProperties.Jwt("access-secret-12345678901234567890", "refresh-secret-12345678901234567890", java.time.Duration.ofMinutes(15), 7),
                12,
                "uploads",
                false,
                "CLOUD",
                new StudyConnectProperties.S3(bucket, region == null || region.isBlank() ? "auto" : region, endpoint, accessKey, secretKey)
        );

        FileStorageService storageService = new FileStorageService(properties);
        assertThat(storageService.isCloudStorageActive()).isTrue();

        String testKey = "resources/live-r2-test-" + UUID.randomUUID() + ".txt";
        byte[] testChunk = "StudyConnect Live R2 Integration Test Chunk Payload Data".getBytes(StandardCharsets.UTF_8);

        // 1. Initiate Multipart Upload
        String uploadId = storageService.initiateMultipartUpload(testKey, "text/plain");
        assertThat(uploadId).isNotNull().isNotBlank();

        // 2. Generate Presigned Part Upload URL
        String presignedPartUrl = storageService.generatePresignedPartUrl(testKey, uploadId, 1);
        assertThat(presignedPartUrl).contains(testKey);

        // 3. Upload Part via Direct HTTP PUT Request
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpRequest putRequest = HttpRequest.newBuilder()
                .uri(URI.create(presignedPartUrl))
                .PUT(HttpRequest.BodyPublishers.ofByteArray(testChunk))
                .header("Content-Type", "text/plain")
                .build();

        HttpResponse<String> putResponse = httpClient.send(putRequest, HttpResponse.BodyHandlers.ofString());
        assertThat(putResponse.statusCode()).isEqualTo(200);

        String etag = putResponse.headers().firstValue("etag").orElse("\"etag-mock-test\"");
        assertThat(etag).isNotBlank();

        // 4. Complete Multipart Upload
        List<UploadSession.PartInfo> completedParts = List.of(new UploadSession.PartInfo(1, etag));
        String finalFileUrl = storageService.completeMultipartUpload(testKey, uploadId, completedParts);
        assertThat(finalFileUrl).contains(testKey);

        // 5. Generate Temporary Presigned Download URL & Download Object
        String downloadUrl = storageService.generatePresignedDownloadUrl(finalFileUrl, "live-r2-test.txt");
        assertThat(downloadUrl).contains("X-Amz-Signature");

        HttpRequest getRequest = HttpRequest.newBuilder().uri(URI.create(downloadUrl)).GET().build();
        HttpResponse<byte[]> getResponse = httpClient.send(getRequest, HttpResponse.BodyHandlers.ofByteArray());
        assertThat(getResponse.statusCode()).isEqualTo(200);
        assertThat(getResponse.body()).isEqualTo(testChunk);

        // 6. Cleanup R2 Object
        storageService.deleteByKey(testKey);
    }
}
