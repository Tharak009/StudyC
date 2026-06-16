import { Router } from "express";
import { resourceController } from "../controllers/resource.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { apiLimiter } from "../middlewares/rate-limit.middleware.js";
import { resourceUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createResourceSchema,
  listResourcesSchema,
  resourceIdParamsSchema,
  updateResourceSchema
} from "../validators/resource.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

export const resourceRouter = Router({ mergeParams: true });

resourceRouter.use(authenticate);
resourceRouter.use(apiLimiter);

resourceRouter.get("/:communityId/resources", validate(listResourcesSchema), asyncHandler(resourceController.list));
resourceRouter.post("/:communityId/resources", resourceUpload, validate(createResourceSchema), asyncHandler(resourceController.create));

export const globalResourceRouter = Router();

globalResourceRouter.use(authenticate);
globalResourceRouter.use(apiLimiter);

globalResourceRouter.get("/resources", validate(listResourcesSchema), asyncHandler(resourceController.list));
globalResourceRouter.get("/resources/:resourceId", validate(resourceIdParamsSchema), asyncHandler(resourceController.getById));
globalResourceRouter.put("/resources/:resourceId", resourceUpload, validate(updateResourceSchema), asyncHandler(resourceController.update));
globalResourceRouter.delete("/resources/:resourceId", validate(resourceIdParamsSchema), asyncHandler(resourceController.delete));
globalResourceRouter.post("/resources/:resourceId/download", validate(resourceIdParamsSchema), asyncHandler(resourceController.download));
