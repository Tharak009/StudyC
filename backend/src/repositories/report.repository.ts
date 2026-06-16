import type { FilterQuery, UpdateQuery } from "mongoose";
import { Report, type IReport, type ReportDocument } from "../models/report.model.js";

export interface CreateReportData {
  reporterId: string;
  targetType: IReport["targetType"];
  targetId: string;
  reason: string;
  description?: string;
}

export interface ReportListOptions {
  page: number;
  limit: number;
  status?: string;
  targetType?: string;
}

export class ReportRepository {
  create(input: CreateReportData): Promise<ReportDocument> {
    return Report.create(input);
  }

  findById(id: string): Promise<ReportDocument | null> {
    return Report.findById(id).exec();
  }

  async list({ page, limit, status, targetType }: ReportListOptions) {
    const filter: FilterQuery<IReport> = {};
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporterId", "fullName rollNumber email profilePicture")
        .populate("reviewedBy", "fullName rollNumber")
        .lean()
        .exec(),
      Report.countDocuments(filter).exec()
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  updateById(id: string, update: UpdateQuery<IReport>): Promise<ReportDocument | null> {
    return Report.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  }

  async deleteManyByTarget(targetType: string, targetId: string) {
    return Report.deleteMany({ targetType, targetId }).exec();
  }
}

export const reportRepository = new ReportRepository();
