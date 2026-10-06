import { Router } from "express";
import { communityController } from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { communityBannerUpload } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  addModeratorSchema,
  banMemberSchema,
  cancelJoinRequestSchema,
  communityIdParamsSchema,
  createCommunitySchema,
  joinRequestActionSchema,
  listCommunitiesSchema,
  listJoinRequestsQuerySchema,
  listMembersQuerySchema,
  moderatorParamsSchema,
  requestJoinSchema,
  suspendMemberSchema,
  unbanMemberSchema,
  updateCommunitySchema
} from "../validators/community.validator.js";
import { communityGroupRouter } from "./community-group.routes.js";

export const communityRouter = Router();
communityRouter.use(authenticate);

communityRouter.use("/:communityId/groups", communityGroupRouter);

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

// Community Lifecycle Actions
communityRouter.post("/:id/archive", validate(communityIdParamsSchema), asyncHandler(communityController.archive));
communityRouter.post("/:id/restore", validate(communityIdParamsSchema), asyncHandler(communityController.restore));

// Membership Actions
communityRouter.post("/:id/join", validate(communityIdParamsSchema), asyncHandler(communityController.join));
communityRouter.post("/:id/join-request", validate(requestJoinSchema), asyncHandler(communityController.requestJoin));
communityRouter.delete("/:id/join-request", validate(cancelJoinRequestSchema), asyncHandler(communityController.cancelJoinRequest));
communityRouter.get("/:id/membership", validate(communityIdParamsSchema), asyncHandler(communityController.getMembership));
communityRouter.post("/:id/leave", validate(communityIdParamsSchema), asyncHandler(communityController.leave));
communityRouter.get("/:id/members", validate(listMembersQuerySchema), asyncHandler(communityController.members));
communityRouter.delete(
  "/:id/members/:userId",
  validate(moderatorParamsSchema),
  asyncHandler(communityController.removeMember)
);

// Join Requests Management
communityRouter.get("/:id/join-requests", validate(listJoinRequestsQuerySchema), asyncHandler(communityController.listJoinRequests));
communityRouter.post("/:id/join-requests/:userId/approve", validate(joinRequestActionSchema), asyncHandler(communityController.approveJoinRequest));
communityRouter.post("/:id/join-requests/:userId/reject", validate(joinRequestActionSchema), asyncHandler(communityController.rejectJoinRequest));

// Membership Moderation & Restrictions
communityRouter.post("/:id/members/:userId/ban", validate(banMemberSchema), asyncHandler(communityController.banMember));
communityRouter.post("/:id/members/:userId/unban", validate(unbanMemberSchema), asyncHandler(communityController.unbanMember));
communityRouter.post("/:id/members/:userId/suspend", validate(suspendMemberSchema), asyncHandler(communityController.suspendMember));

// Moderator Actions
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

// Channel Study Mode
communityRouter.patch(
  "/:id/channels/:channelId/study-mode",
  asyncHandler(communityController.updateChannelStudyMode)
);
