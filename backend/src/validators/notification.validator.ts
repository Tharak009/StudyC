import { z } from "zod";
import { NOTIFICATION_TYPES } from "../constants/notification.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const listNotificationsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    unreadOnly: z.enum(["true", "false"]).optional()
  })
});

export const notificationIdParamsSchema = z.object({
  params: z.object({ notificationId: objectId })
});

export const createNotificationSchema = z.object({
  body: z.object({
    userId: objectId,
    type: z.enum(Object.values(NOTIFICATION_TYPES) as [string, ...string[]]),
    title: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(1000),
    entityType: z.string().optional(),
    entityId: objectId.optional()
  })
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>["query"];
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>["body"];
