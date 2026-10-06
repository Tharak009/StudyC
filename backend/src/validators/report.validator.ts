import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { REPORT_TARGET_TYPES } from "../constants/report.js";

export const cleanTargetId = (id: string): string => {
  if (!id) return "";
  const trimmed = id.trim();
  if (trimmed.startsWith("studyconnect_")) {
    return trimmed.slice("studyconnect_".length);
  }
  if (trimmed.startsWith("comm_")) {
    const parts = trimmed.slice("comm_".length).split("_");
    return parts[0] || trimmed;
  }
  return trimmed;
};

export const createReportSchema = z.object({
  body: z
    .object({
      targetType: z.enum([
        REPORT_TARGET_TYPES.USER,
        REPORT_TARGET_TYPES.COMMUNITY,
        REPORT_TARGET_TYPES.MESSAGE,
        REPORT_TARGET_TYPES.RESOURCE
      ]),
      targetId: z
        .string()
        .trim()
        .min(1, "Target ID is required")
        .max(128, "Target ID is too long"),
      reason: z
        .string()
        .trim()
        .min(3, "Reason must be at least 3 characters")
        .max(100, "Reason must be at most 100 characters"),
      description: z
        .string()
        .trim()
        .max(1000, "Description must be at most 1000 characters")
        .optional()
        .default("")
    })
    .refine(
      (data) => {
        if (data.targetType === REPORT_TARGET_TYPES.MESSAGE) {
          return Boolean(data.targetId && data.targetId.length > 0);
        }
        const cleaned = cleanTargetId(data.targetId);
        return isValidObjectId(cleaned);
      },
      { message: "Invalid target identifier", path: ["targetId"] }
    )
});

export type CreateReportInput = z.infer<typeof createReportSchema>["body"];
