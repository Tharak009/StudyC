import { Router } from "express";
import { ROLES } from "../constants/roles.js";
import { adminController } from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listUsersSchema,
  userIdParamsSchema,
  listCommunitiesSchema,
  communityIdParamsSchema,
  listResourcesSchema,
  resourceIdParamsSchema,
  messageIdParamsSchema,
  listReportsSchema,
  reviewReportSchema
} from "../validators/admin.validator.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(authorize(ROLES.ADMIN));
adminRouter.use(apiLimiter);

adminRouter.get("/dashboard", asyncHandler(adminController.dashboard));

adminRouter.get("/users", validate(listUsersSchema), asyncHandler(adminController.listUsers));
adminRouter.get("/users/:userId", validate(userIdParamsSchema), asyncHandler(adminController.getUser));
adminRouter.patch("/users/:userId/ban", validate(userIdParamsSchema), asyncHandler(adminController.banUser));
adminRouter.patch("/users/:userId/unban", validate(userIdParamsSchema), asyncHandler(adminController.unbanUser));
adminRouter.patch("/users/:userId/activate", validate(userIdParamsSchema), asyncHandler(adminController.activateUser));
adminRouter.patch("/users/:userId/suspend", validate(userIdParamsSchema), asyncHandler(adminController.suspendUser));
adminRouter.delete("/users/:userId", validate(userIdParamsSchema), asyncHandler(adminController.deleteUser));

adminRouter.get("/communities", validate(listCommunitiesSchema), asyncHandler(adminController.listCommunities));
adminRouter.delete("/communities/:communityId", validate(communityIdParamsSchema), asyncHandler(adminController.deleteCommunity));

adminRouter.get("/resources", validate(listResourcesSchema), asyncHandler(adminController.listResources));
adminRouter.delete("/resources/:resourceId", validate(resourceIdParamsSchema), asyncHandler(adminController.deleteResource));

adminRouter.get("/reports", validate(listReportsSchema), asyncHandler(adminController.listReports));
adminRouter.patch("/reports/:reportId", validate(reviewReportSchema), asyncHandler(adminController.reviewReport));

adminRouter.delete("/messages/:messageId", validate(messageIdParamsSchema), asyncHandler(adminController.deleteMessage));
adminRouter.delete("/direct-messages/:messageId", validate(messageIdParamsSchema), asyncHandler(adminController.deleteDirectMessage));
