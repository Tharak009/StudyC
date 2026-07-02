package com.studyconnect.backend.repository;

import com.studyconnect.backend.entity.Report;
import com.studyconnect.backend.entity.enums.ReportStatus;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReportRepository extends MongoRepository<Report, String> {
    List<Report> findAllByReporterId(String reporterId);

    long countByStatus(ReportStatus status);

    long countByStatusAndTargetType(ReportStatus status, com.studyconnect.backend.entity.enums.ReportTargetType targetType);
}
