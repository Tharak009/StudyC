import { Router } from "express";
import { communityGroupController } from "../controllers/community-group.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  attachGroupSchema,
  communityGroupParamsSchema,
  createGroupSchema,
  updateGroupSchema
} from "../validators/community-group.validator.js";

export const communityGroupRouter = Router({ mergeParams: true });

communityGroupRouter.use(authenticate);

communityGroupRouter.get("/", asyncHandler(communityGroupController.list));

communityGroupRouter.post(
  "/",
  validate(createGroupSchema),
  asyncHandler(communityGroupController.create)
);

communityGroupRouter.post(
  "/attach",
  validate(attachGroupSchema),
  asyncHandler(communityGroupController.attach)
);

communityGroupRouter.get(
  "/:groupId",
  validate(communityGroupParamsSchema),
  asyncHandler(communityGroupController.get)
);

communityGroupRouter.put(
  "/:groupId",
  validate(updateGroupSchema),
  asyncHandler(communityGroupController.update)
);

communityGroupRouter.post(
  "/:groupId/archive",
  validate(communityGroupParamsSchema),
  asyncHandler(communityGroupController.archive)
);

communityGroupRouter.delete(
  "/:groupId",
  validate(communityGroupParamsSchema),
  asyncHandler(communityGroupController.delete)
);
