package com.studyconnect.backend.service;

import com.studyconnect.backend.config.StudyConnectProperties;
import com.studyconnect.backend.entity.UploadSession;
import com.studyconnect.backend.exception.BadRequestException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.AbortMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompleteMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CompletedMultipartUpload;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadRequest;
import software.amazon.awssdk.services.s3.model.CreateMultipartUploadResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedUploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

@Service
public class FileStorageService {

    private final Path root;
    private final StudyConnectProperties properties;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucket;
    private final boolean cloudStorageActive;

    public FileStorageService(StudyConnectProperties properties) {
        this.properties = properties;
        this.root = Paths.get(properties.uploadDir()).toAbsolutePath().normalize();

        boolean isCloudModeRequested = "CLOUD".equalsIgnoreCase(properties.storageMode());
        boolean isS3Configured = properties.s3() != null && properties.s3().isConfigured();

        if (isCloudModeRequested && !isS3Configured) {
            throw new IllegalStateException("Production storage mode is configured as CLOUD (studyconnect.storage-mode=CLOUD), but Cloudflare R2 / S3 credentials (S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY) are missing or incomplete!");
        }

        if (isS3Configured && !"LOCAL".equalsIgnoreCase(properties.storageMode())) {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(properties.s3().accessKey(), properties.s3().secretKey());
            StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(credentials);
            Region region = Region.of(properties.s3().region() == null || properties.s3().region().isBlank() ? "auto" : properties.s3().region());

            S3Configuration s3Config = S3Configuration.builder()
                    .pathStyleAccessEnabled(true)
                    .build();

            S3ClientBuilder clientBuilder = S3Client.builder()
                    .region(region)
                    .credentialsProvider(credentialsProvider)
                    .serviceConfiguration(s3Config);

            S3Presigner.Builder presignerBuilder = S3Presigner.builder()
                    .region(region)
                    .credentialsProvider(credentialsProvider)
                    .serviceConfiguration(s3Config);

            if (properties.s3().endpoint() != null && !properties.s3().endpoint().isBlank()) {
                String endpointStr = properties.s3().endpoint().trim();
                if (!endpointStr.startsWith("http://") && !endpointStr.startsWith("https://")) {
                    endpointStr = "https://" + endpointStr;
                }
                URI endpointUri = URI.create(endpointStr);
                clientBuilder.endpointOverride(endpointUri);
                presignerBuilder.endpointOverride(endpointUri);
            }

            this.s3Client = clientBuilder.build();
            this.s3Presigner = presignerBuilder.build();
            this.bucket = properties.s3().bucket();
            this.cloudStorageActive = true;
        } else {
            this.s3Client = null;
            this.s3Presigner = null;
            this.bucket = null;
            this.cloudStorageActive = false;
        }
    }

    public boolean isCloudStorageActive() {
        return cloudStorageActive;
    }

    public StoredFile store(MultipartFile file, String subdirectory, Set<String> allowedMimeTypes, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required", "FILE_REQUIRED");
        }
        if (file.getSize() > maxBytes) {
            throw new BadRequestException("File exceeds the allowed size", "FILE_TOO_LARGE");
        }
        String contentType = file.getContentType();
        if (contentType != null && !allowedMimeTypes.isEmpty() && !allowedMimeTypes.contains(contentType) && !allowedMimeTypes.contains("application/octet-stream")) {
            throw new BadRequestException("Unsupported file type: " + contentType, "INVALID_FILE_TYPE");
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
                    contentType == null ? "application/octet-stream" : contentType,
                    file.getSize(),
                    Instant.now()
            );
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store uploaded file", "FILE_UPLOAD_FAILED");
        }
    }

    public String initiateMultipartUpload(String key, String contentType) {
        if (cloudStorageActive) {
            try {
                CreateMultipartUploadRequest request = CreateMultipartUploadRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .build();
                CreateMultipartUploadResponse response = s3Client.createMultipartUpload(request);
                return response.uploadId();
            } catch (S3Exception ex) {
                throw new BadRequestException("Cloud storage multipart upload initiation failed: " + ex.awsErrorDetails().errorMessage(), "CLOUD_UPLOAD_INIT_FAILED");
            }
        }
        return "local-upload-" + UUID.randomUUID();
    }

    public String generatePresignedPartUrl(String key, String uploadId, int partNumber) {
        if (cloudStorageActive) {
            try {
                UploadPartRequest uploadPartRequest = UploadPartRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .uploadId(uploadId)
                        .partNumber(partNumber)
                        .build();

                UploadPartPresignRequest presignRequest = UploadPartPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(30))
                        .uploadPartRequest(uploadPartRequest)
                        .build();

                PresignedUploadPartRequest presignedRequest = s3Presigner.presignUploadPart(presignRequest);
                return presignedRequest.url().toString();
            } catch (Exception ex) {
                throw new BadRequestException("Failed to generate presigned part URL: " + ex.getMessage(), "PRESIGNED_URL_FAILED");
            }
        }
        return "/api/resources/upload/local-part-upload?key=" + key + "&partNumber=" + partNumber + "&uploadId=" + uploadId;
    }

    public String saveLocalPart(String uploadId, int partNumber, InputStream inputStream) {
        try {
            Path tempDir = root.resolve("temp-sessions").resolve(uploadId);
            Files.createDirectories(tempDir);
            Path partFile = tempDir.resolve("part-" + partNumber);
            Files.copy(inputStream, partFile, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return "\"etag-local-part-" + partNumber + "\"";
        } catch (IOException ex) {
            throw new BadRequestException("Failed to store local upload chunk", "LOCAL_CHUNK_FAILED");
        }
    }

    public String completeMultipartUpload(String key, String uploadId, List<UploadSession.PartInfo> completedParts) {
        if (cloudStorageActive) {
            try {
                List<CompletedPart> parts = completedParts.stream()
                        .map(p -> {
                            String etag = p.getEtag();
                            if (etag != null) {
                                etag = etag.trim();
                                if (!etag.startsWith("\"")) etag = "\"" + etag;
                                if (!etag.endsWith("\"")) etag = etag + "\"";
                            }
                            return CompletedPart.builder()
                                    .partNumber(p.getPartNumber())
                                    .eTag(etag)
                                    .build();
                        })
                        .toList();

                CompletedMultipartUpload completedUpload = CompletedMultipartUpload.builder()
                        .parts(parts)
                        .build();

                CompleteMultipartUploadRequest completeRequest = CompleteMultipartUploadRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .uploadId(uploadId)
                        .multipartUpload(completedUpload)
                        .build();

                s3Client.completeMultipartUpload(completeRequest);

                if (properties.s3().endpoint() != null && !properties.s3().endpoint().isBlank()) {
                    String baseEndpoint = properties.s3().endpoint().trim();
                    if (!baseEndpoint.startsWith("http://") && !baseEndpoint.startsWith("https://")) {
                        baseEndpoint = "https://" + baseEndpoint;
                    }
                    if (baseEndpoint.endsWith("/")) {
                        baseEndpoint = baseEndpoint.substring(0, baseEndpoint.length() - 1);
                    }
                    return baseEndpoint + "/" + bucket + "/" + key;
                }
                return "https://" + bucket + ".r2.cloudflarestorage.com/" + key;
            } catch (S3Exception ex) {
                throw new BadRequestException("Cloud storage multipart upload completion failed: " + ex.awsErrorDetails().errorMessage(), "CLOUD_UPLOAD_COMPLETE_FAILED");
            }
        } else {
            try {
                Path destination = root.resolve(key).normalize();
                Files.createDirectories(destination.getParent());
                Path tempDir = root.resolve("temp-sessions").resolve(uploadId);

                try (OutputStream os = Files.newOutputStream(destination, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
                    List<UploadSession.PartInfo> sorted = completedParts.stream()
                            .sorted(Comparator.comparingInt(UploadSession.PartInfo::getPartNumber))
                            .toList();

                    for (UploadSession.PartInfo part : sorted) {
                        Path partPath = tempDir.resolve("part-" + part.getPartNumber());
                        if (Files.exists(partPath)) {
                            Files.copy(partPath, os);
                        }
                    }
                }

                deleteDirectoryRecursively(tempDir);
                return "/uploads/" + key.replace('\\', '/');
            } catch (IOException ex) {
                throw new BadRequestException("Failed to complete local upload assembly", "LOCAL_COMPLETE_FAILED");
            }
        }
    }

    public void abortMultipartUpload(String key, String uploadId) {
        if (cloudStorageActive) {
            try {
                AbortMultipartUploadRequest abortRequest = AbortMultipartUploadRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .uploadId(uploadId)
                        .build();
                s3Client.abortMultipartUpload(abortRequest);
            } catch (Exception ignored) {
                // Best-effort abort
            }
        } else {
            Path tempDir = root.resolve("temp-sessions").resolve(uploadId);
            deleteDirectoryRecursively(tempDir);
            deleteByKey(key);
        }
    }

    public String generatePresignedDownloadUrl(String fileUrl, String fileName) {
        if (cloudStorageActive && fileUrl != null && !fileUrl.isBlank() && !fileUrl.startsWith("/")) {
            try {
                String key;
                if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
                    URI uri = URI.create(fileUrl);
                    String path = uri.getPath();
                    if (bucket != null && path.startsWith("/" + bucket + "/")) {
                        key = path.substring(bucket.length() + 2);
                    } else if (path.startsWith("/")) {
                        key = path.substring(1);
                    } else {
                        key = path;
                    }
                } else {
                    key = fileUrl;
                }

                GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .responseContentDisposition("attachment; filename=\"" + fileName + "\"")
                        .build();

                GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(60))
                        .getObjectRequest(getObjectRequest)
                        .build();

                PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
                return presignedRequest.url().toString();
            } catch (Exception ex) {
                return fileUrl;
            }
        }
        return fileUrl == null ? "#" : fileUrl;
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

    private void deleteDirectoryRecursively(Path dir) {
        if (Files.exists(dir)) {
            try (Stream<Path> walk = Files.walk(dir)) {
                walk.sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(java.io.File::delete);
            } catch (IOException ignored) {
            }
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

