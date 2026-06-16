import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listNotificationsSchema,
  notificationIdParamsSchema
} from "../validators/notification.validator.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.use(apiLimiter);

notificationRouter.get("/", validate(listNotificationsSchema), asyncHandler(notificationController.list));
notificationRouter.get("/unread-count", asyncHandler(notificationController.unreadCount));
notificationRouter.patch("/:notificationId/read", validate(notificationIdParamsSchema), asyncHandler(notificationController.markAsRead));
notificationRouter.patch("/read-all", asyncHandler(notificationController.markAllAsRead));
notificationRouter.delete("/:notificationId", validate(notificationIdParamsSchema), asyncHandler(notificationController.delete));
notificationRouter.delete("/", asyncHandler(notificationController.clearAll));
