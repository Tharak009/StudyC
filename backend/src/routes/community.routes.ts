import { Router } from "express";
import { communityController } from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { communityBannerUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  addModeratorSchema,
  communityIdParamsSchema,
  createCommunitySchema,
  listCommunitiesSchema,
  moderatorParamsSchema,
  updateCommunitySchema
} from "../validators/community.validator.js";

export const communityRouter = Router();
communityRouter.use(authenticate);

communityRouter.post(
  "/",
  communityBannerUpload,
  validate(createCommunitySchema),
  asyncHandler(communityController.create)
);
communityRouter.get("/", validate(listCommunitiesSchema), asyncHandler(communityController.list));
communityRouter.get("/:id", validate(communityIdParamsSchema), asyncHandler(communityController.details));
communityRouter.put(
  "/:id",
  communityBannerUpload,
  validate(updateCommunitySchema),
  asyncHandler(communityController.update)
);
communityRouter.delete("/:id", validate(communityIdParamsSchema), asyncHandler(communityController.delete));

communityRouter.post("/:id/join", validate(communityIdParamsSchema), asyncHandler(communityController.join));
communityRouter.post("/:id/leave", validate(communityIdParamsSchema), asyncHandler(communityController.leave));
communityRouter.get("/:id/members", validate(communityIdParamsSchema), asyncHandler(communityController.members));
communityRouter.delete(
  "/:id/members/:userId",
  validate(moderatorParamsSchema),
  asyncHandler(communityController.removeMember)
);

communityRouter.post(
  "/:id/moderators",
  validate(addModeratorSchema),
  asyncHandler(communityController.addModerator)
);
communityRouter.delete(
  "/:id/moderators/:userId",
  validate(moderatorParamsSchema),
  asyncHandler(communityController.removeModerator)
);
