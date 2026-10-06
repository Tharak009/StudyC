import type { Request, Response } from "express";
import { reportService } from "../services/report.service.js";
import { ApiResponse } from "../utils/api-response.js";
import type { CreateReportInput } from "../validators/report.validator.js";

export class ReportController {
  async createReport(request: Request, response: Response) {
    const report = await reportService.createReport(
      request.user!.id,
      request.body as CreateReportInput
    );
    response.status(201).json(new ApiResponse(201, report, "Report submitted successfully for moderation review"));
  }
}

export const reportController = new ReportController();
