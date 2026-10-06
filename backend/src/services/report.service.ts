import { reportRepository, type ReportRepository } from "../repositories/report.repository.js";
import { userRepository, type UserRepository } from "../repositories/user.repository.js";
import { Community } from "../models/community.model.js";
import { Resource } from "../models/resource.model.js";
import { ApiError } from "../utils/api-error.js";
import { REPORT_TARGET_TYPES, type ReportTargetType } from "../constants/report.js";
import { cleanTargetId, type CreateReportInput } from "../validators/report.validator.js";

export class ReportService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly users: UserRepository
  ) {}

  async createReport(reporterId: string, input: CreateReportInput) {
    const targetType = input.targetType;
    const reason = input.reason;
    const description = input.description || "";
    const targetId = cleanTargetId(input.targetId);

    // 1. Self-report check
    if (targetType === REPORT_TARGET_TYPES.USER && targetId === reporterId) {
      throw new ApiError(400, "You cannot report your own account", [], "SELF_REPORT_FORBIDDEN");
    }

    // 2. Target existence validation
    await this.validateTargetExists(targetType, targetId);

    // 3. Deduplication: pending report for same target by same user
    const existing = await this.reports.findPendingByReporterAndTarget(reporterId, targetType, targetId);
    if (existing) {
      throw new ApiError(409, "You have already submitted a pending report for this item", [], "REPORT_DUPLICATE");
    }

    return this.reports.create({
      reporterId,
      targetType,
      targetId,
      reason,
      description: description || ""
    });
  }

  private async validateTargetExists(targetType: ReportTargetType, targetId: string): Promise<void> {
    switch (targetType) {
      case REPORT_TARGET_TYPES.USER: {
        const user = await this.users.findById(targetId);
        if (!user) throw new ApiError(404, "Reported user does not exist", [], "TARGET_NOT_FOUND");
        break;
      }
      case REPORT_TARGET_TYPES.COMMUNITY: {
        const community = await Community.findById(targetId);
        if (!community) throw new ApiError(404, "Reported study circle does not exist", [], "TARGET_NOT_FOUND");
        break;
      }
      case REPORT_TARGET_TYPES.MESSAGE: {
        if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
          throw new ApiError(400, "Valid message ID is required", [], "INVALID_TARGET_ID");
        }
        break;
      }
      case REPORT_TARGET_TYPES.RESOURCE: {
        const resource = await Resource.findById(targetId);
        if (!resource) throw new ApiError(404, "Reported academic resource does not exist", [], "TARGET_NOT_FOUND");
        break;
      }
      default:
        throw new ApiError(400, "Unsupported report target type", [], "INVALID_TARGET_TYPE");
    }
  }
}

export const reportService = new ReportService(reportRepository, userRepository);
