import { z } from "zod";
import { ROLES } from "../constants/roles.js";
import { REPORT_STATUS } from "../constants/report.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    role: z.enum(Object.values(ROLES) as [string, ...string[]]).optional(),
    status: z.string().optional()
  })
});

export const userIdParamsSchema = z.object({
  params: z.object({ userId: objectId })
});

export const listCommunitiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional()
  })
});

export const communityIdParamsSchema = z.object({
  params: z.object({ communityId: objectId })
});

export const resourceIdParamsSchema = z.object({
  params: z.object({ resourceId: objectId })
});

export const messageIdParamsSchema = z.object({
  params: z.object({ messageId: objectId })
});

export const listResourcesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional()
  })
});

export const listReportsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.string().optional(),
    targetType: z.string().optional()
  })
});

export const reviewReportSchema = z.object({
  params: z.object({ reportId: objectId }),
  body: z.object({
    status: z.enum(Object.values(REPORT_STATUS) as [string, ...string[]]),
    description: z.string().optional()
  })
});
