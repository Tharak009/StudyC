import { Router } from "express";
import { resourceController } from "../controllers/resource.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { resourceUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createResourceSchema,
  listResourcesSchema,
  resourceIdParamsSchema,
  updateResourceSchema,
  initiateUploadSchema,
  getPartUrlsSchema,
  completeUploadSchema,
  uploadSessionParamsSchema,
  rateResourceSchema
} from "../validators/resource.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

export const resourceRouter = Router({ mergeParams: true });

resourceRouter.use(authenticate);

resourceRouter.post("/:communityId/resources/upload/initiate", validate(initiateUploadSchema), asyncHandler(resourceController.initiateUpload));
resourceRouter.get("/:communityId/resources", validate(listResourcesSchema), asyncHandler(resourceController.list));
resourceRouter.post("/:communityId/resources", resourceUpload, validate(createResourceSchema), asyncHandler(resourceController.create));

export const globalResourceRouter = Router();

globalResourceRouter.use(authenticate);

globalResourceRouter.post("/resources/upload/initiate", validate(initiateUploadSchema), asyncHandler(resourceController.initiateUpload));
globalResourceRouter.get("/resources/upload/:sessionId/part-urls", validate(getPartUrlsSchema), asyncHandler(resourceController.getPartUrls));
globalResourceRouter.post("/resources/upload/:sessionId/complete", validate(completeUploadSchema), asyncHandler(resourceController.completeUpload));
globalResourceRouter.delete("/resources/upload/:sessionId/abort", validate(uploadSessionParamsSchema), asyncHandler(resourceController.abortUpload));
globalResourceRouter.put("/resources/upload/local-part-upload", asyncHandler(resourceController.saveLocalPart));

globalResourceRouter.get("/resources", validate(listResourcesSchema), asyncHandler(resourceController.list));
globalResourceRouter.post("/resources", resourceUpload, validate(createResourceSchema), asyncHandler(resourceController.create));
globalResourceRouter.get("/resources/:resourceId/download-url", validate(resourceIdParamsSchema), asyncHandler(resourceController.getDownloadUrl));
globalResourceRouter.get("/resources/:resourceId/preview-url", validate(resourceIdParamsSchema), asyncHandler(resourceController.getPreviewUrl));
globalResourceRouter.get("/resources/:resourceId", validate(resourceIdParamsSchema), asyncHandler(resourceController.getById));
globalResourceRouter.put("/resources/:resourceId", resourceUpload, validate(updateResourceSchema), asyncHandler(resourceController.update));
globalResourceRouter.delete("/resources/:resourceId", validate(resourceIdParamsSchema), asyncHandler(resourceController.delete));
globalResourceRouter.post("/resources/:resourceId/download", validate(resourceIdParamsSchema), asyncHandler(resourceController.download));
globalResourceRouter.post("/resources/:resourceId/rate", validate(rateResourceSchema), asyncHandler(resourceController.rate));


