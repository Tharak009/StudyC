package com.studyconnect.backend.dto.resource;

import com.studyconnect.backend.entity.UploadSession;
import java.util.List;

public record UploadCompleteRequest(
        List<UploadSession.PartInfo> completedParts
) {}
